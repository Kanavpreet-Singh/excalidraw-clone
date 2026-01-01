import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { prisma } from '@repo/db';
import http from 'http';

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/notify-room-deleted') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const { roomId } = JSON.parse(body);
        if (roomId) {
          notifyRoomDeleted(roomId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'roomId required' }));
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocketServer({ server });
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ==================== TYPES ====================

interface Shape {
  id: string;
  type: 'rect' | 'circle' | 'line' | 'diamond';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RoomState {
  shapes: Shape[];
  isDirty: boolean;  // Track if shapes changed since last save
  lastSaved: number; // Timestamp of last DB save
  saveTimer?: NodeJS.Timeout;
}

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  rooms: Set<string>;  // User can be in multiple rooms
}

// ==================== IN-MEMORY STATE ====================

// Map of roomId -> Set of connected clients
const roomConnections = new Map<string, Set<AuthenticatedWebSocket>>();

// Map of roomId -> RoomState (shapes array + metadata)
const roomStates = new Map<string, RoomState>();

const SAVE_INTERVAL = 30000; // 30 seconds

// ==================== DB PERSISTENCE ====================

async function saveRoomToDb(roomId: string, force: boolean = false): Promise<boolean> {
  const state = roomStates.get(roomId);
  if (!state) return false;
  
  // Skip if not dirty and not forced
  if (!state.isDirty && !force) return false;
  
  try {
    await prisma.room.update({
      where: { roomId },
      data: { shapes: state.shapes as unknown as object }
    });
    
    state.isDirty = false;
    state.lastSaved = Date.now();
    console.log(`Saved room ${roomId} to DB (${state.shapes.length} shapes)`);
    return true;
  } catch (error) {
    console.error(`Failed to save room ${roomId}:`, error);
    return false;
  }
}

async function loadRoomFromDb(roomId: string): Promise<Shape[]> {
  try {
    const room = await prisma.room.findUnique({
      where: { roomId },
      select: { shapes: true }
    });
    
    if (room?.shapes && Array.isArray(room.shapes)) {
      return room.shapes as unknown as Shape[];
    }
    return [];
  } catch (error) {
    console.error(`Failed to load room ${roomId}:`, error);
    return [];
  }
}

function startAutoSave(roomId: string) {
  const state = roomStates.get(roomId);
  if (!state || state.saveTimer) return;
  
  state.saveTimer = setInterval(() => {
    saveRoomToDb(roomId);
  }, SAVE_INTERVAL);
}

function stopAutoSave(roomId: string) {
  const state = roomStates.get(roomId);
  if (state?.saveTimer) {
    clearInterval(state.saveTimer);
    state.saveTimer = undefined;
  }
}

// ==================== BROADCAST HELPERS ====================

function broadcastToRoom(roomId: string, message: any, excludeWs?: AuthenticatedWebSocket) {
  const clients = roomConnections.get(roomId);
  if (!clients) return;

  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

function broadcastToRoomAll(roomId: string, message: any) {
  const clients = roomConnections.get(roomId);
  if (!clients) return;

  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

function notifyRoomDeleted(roomId: string) {
  broadcastToRoomAll(roomId, { type: 'room-deleted', roomId });
  stopAutoSave(roomId);
  roomStates.delete(roomId);
  roomConnections.delete(roomId);
}

// ==================== ROOM MANAGEMENT ====================

async function handleJoinRoom(ws: AuthenticatedWebSocket, roomId: string) {
  // Verify room exists
  const room = await prisma.room.findUnique({
    where: { roomId }
  });

  if (!room) {
    ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
    return;
  }

  // Verify user is a member
  const isMember = await prisma.roomMember.findUnique({
    where: {
      userId_roomId: {
        userId: ws.userId!,
        roomId: room.id
      }
    }
  });

  if (!isMember && room.userId !== ws.userId) {
    ws.send(JSON.stringify({ type: 'error', message: 'You are not a member of this room' }));
    return;
  }

  // Add to room connections
  ws.rooms.add(roomId);
  if (!roomConnections.has(roomId)) {
    roomConnections.set(roomId, new Set());
  }
  roomConnections.get(roomId)!.add(ws);

  // Initialize room state if first user
  if (!roomStates.has(roomId)) {
    const shapes = await loadRoomFromDb(roomId);
    roomStates.set(roomId, {
      shapes,
      isDirty: false,
      lastSaved: Date.now()
    });
    startAutoSave(roomId);
  }

  const state = roomStates.get(roomId)!;

  console.log(`User ${ws.userId} joined room ${roomId}`);
  
  // Send current shapes to the joining user
  ws.send(JSON.stringify({ 
    type: 'joined-room', 
    roomId,
    shapes: state.shapes
  }));

  // Notify others
  broadcastToRoom(roomId, {
    type: 'user-joined',
    userId: ws.userId
  }, ws);
}

async function handleLeaveRoom(ws: AuthenticatedWebSocket, roomId: string) {
  if (!ws.rooms.has(roomId)) return;

  ws.rooms.delete(roomId);
  
  const clients = roomConnections.get(roomId);
  if (clients) {
    clients.delete(ws);
    
    // If room is now empty, save and cleanup
    if (clients.size === 0) {
      await saveRoomToDb(roomId, true);
      stopAutoSave(roomId);
      roomStates.delete(roomId);
      roomConnections.delete(roomId);
      console.log(`Room ${roomId} is now empty, saved and cleaned up`);
    }
  }

  // Notify others
  broadcastToRoom(roomId, {
    type: 'user-left',
    userId: ws.userId
  }, ws);

  ws.send(JSON.stringify({ type: 'left-room', roomId }));
}

// ==================== SHAPE OPERATIONS ====================

function handleAddShape(ws: AuthenticatedWebSocket, roomId: string, shape: Shape) {
  if (!ws.rooms.has(roomId)) {
    ws.send(JSON.stringify({ type: 'error', message: 'Not in this room' }));
    return;
  }

  const state = roomStates.get(roomId);
  if (!state) return;

  state.shapes.push(shape);
  state.isDirty = true;

  // Broadcast to all including sender for consistency
  broadcastToRoomAll(roomId, {
    type: 'shape-added',
    roomId,
    shape
  });
}

function handleRemoveShape(ws: AuthenticatedWebSocket, roomId: string, shapeId: string) {
  if (!ws.rooms.has(roomId)) {
    ws.send(JSON.stringify({ type: 'error', message: 'Not in this room' }));
    return;
  }

  const state = roomStates.get(roomId);
  if (!state) return;

  const index = state.shapes.findIndex(s => s.id === shapeId);
  if (index !== -1) {
    state.shapes.splice(index, 1);
    state.isDirty = true;

    broadcastToRoomAll(roomId, {
      type: 'shape-removed',
      roomId,
      shapeId
    });
  }
}

function handleUpdateShape(ws: AuthenticatedWebSocket, roomId: string, shape: Shape) {
  if (!ws.rooms.has(roomId)) {
    ws.send(JSON.stringify({ type: 'error', message: 'Not in this room' }));
    return;
  }

  const state = roomStates.get(roomId);
  if (!state) return;

  const index = state.shapes.findIndex(s => s.id === shape.id);
  if (index !== -1) {
    state.shapes[index] = shape;
    state.isDirty = true;

    broadcastToRoom(roomId, {
      type: 'shape-updated',
      roomId,
      shape
    }, ws);  // Exclude sender to avoid flicker
  }
}

function handleSyncShapes(ws: AuthenticatedWebSocket, roomId: string, shapes: Shape[]) {
  if (!ws.rooms.has(roomId)) {
    ws.send(JSON.stringify({ type: 'error', message: 'Not in this room' }));
    return;
  }

  const state = roomStates.get(roomId);
  if (!state) return;

  state.shapes = shapes;
  state.isDirty = true;

  broadcastToRoom(roomId, {
    type: 'shapes-synced',
    roomId,
    shapes
  }, ws);
}

async function handleManualSave(ws: AuthenticatedWebSocket, roomId: string) {
  if (!ws.rooms.has(roomId)) {
    ws.send(JSON.stringify({ type: 'error', message: 'Not in this room' }));
    return;
  }

  const saved = await saveRoomToDb(roomId, true);
  ws.send(JSON.stringify({ 
    type: 'save-result', 
    roomId,
    success: saved 
  }));
}

// ==================== WEBSOCKET CONNECTION HANDLER ====================

wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
  console.log('New connection attempt');
  
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  
  if (!token) {
    console.log('Connection rejected: No token provided');
    ws.close(1008, 'No token provided');
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    ws.userId = decoded.userId;
    ws.rooms = new Set();
    console.log(`Client connected: User ${ws.userId}`);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received message:', message.type);

        switch (message.type) {
          case 'join-room':
            await handleJoinRoom(ws, message.roomId);
            break;

          case 'leave-room':
            await handleLeaveRoom(ws, message.roomId);
            break;

          case 'add-shape':
            handleAddShape(ws, message.roomId, message.shape);
            break;

          case 'remove-shape':
            handleRemoveShape(ws, message.roomId, message.shapeId);
            break;

          case 'update-shape':
            handleUpdateShape(ws, message.roomId, message.shape);
            break;

          case 'sync-shapes':
            handleSyncShapes(ws, message.roomId, message.shapes);
            break;

          case 'save':
            await handleManualSave(ws, message.roomId);
            break;

          case 'unload':
            // Browser is closing, save all rooms user is in
            for (const roomId of ws.rooms) {
              await saveRoomToDb(roomId, true);
            }
            ws.send(JSON.stringify({ type: 'unload-ack' }));
            break;

          default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
        }
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
      }
    });

    ws.on('close', async () => {
      console.log(`Client disconnected: User ${ws.userId}`);
      
      // Leave all rooms and save if needed
      for (const roomId of ws.rooms) {
        await handleLeaveRoom(ws, roomId);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

  } catch (error) {
    console.log('Connection rejected: Invalid token', error);
    ws.close(1008, 'Invalid token');
    return;
  }
});

server.listen(8080, () => {
  console.log('WebSocket server running on port 8080');
});
