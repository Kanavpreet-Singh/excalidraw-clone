import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { prisma } from '@repo/db';
import http from 'http';

const server = http.createServer((req, res) => {
  // Simple HTTP endpoint to notify room deletion
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

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  roomId?: string;
}

// Map to track all connections by room
const roomConnections = new Map<string, Set<AuthenticatedWebSocket>>();

// Helper to broadcast message to all clients in a room except sender
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

// Helper to broadcast to all clients in a room including sender
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

// Export function to notify room deletion from external sources
function notifyRoomDeleted(roomId: string) {
  broadcastToRoomAll(roomId, { type: 'room-deleted', roomId });
  // Clean up room connections
  roomConnections.delete(roomId);
}

wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
  console.log('New connection attempt');
  
  // Extract token from query parameters
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  
  // Validate token before proceeding
  if (!token) {
    console.log('Connection rejected: No token provided');
    ws.close(1008, 'No token provided');
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    ws.userId = decoded.userId;
    console.log(`Client connected: User ${ws.userId}`);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received message:', message);

        switch (message.type) {
          case 'join-room': {
            const { roomId } = message;
            
            // Verify user has access to this room
            const room = await prisma.room.findUnique({
              where: { roomId }
            });

            if (!room) {
              ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
              return;
            }

            const isMember = await prisma.roomMember.findUnique({
              where: {
                userId_roomId: {
                  userId: ws.userId!,
                  roomId: room.id
                }
              }
            });

            if (!isMember) {
              ws.send(JSON.stringify({ type: 'error', message: 'You are not a member of this room' }));
              return;
            }

            // Add to room connections
            ws.roomId = roomId;
            if (!roomConnections.has(roomId)) {
              roomConnections.set(roomId, new Set());
            }
            roomConnections.get(roomId)!.add(ws);

            console.log(`User ${ws.userId} joined room ${roomId}`);
            ws.send(JSON.stringify({ type: 'joined-room', roomId }));

            // Notify others in room
            broadcastToRoom(roomId, {
              type: 'user-joined',
              userId: ws.userId
            }, ws);
            
            break;
          }

          case 'send-message': {
            if (!ws.roomId) {
              ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
              return;
            }

            const { message: messageText, roomId } = message;

            // Save message to database
            const room = await prisma.room.findUnique({
              where: { roomId }
            });

            if (!room) {
              ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
              return;
            }

            const savedMessage = await prisma.chat.create({
              data: {
                message: messageText,
                userId: ws.userId!,
                roomId: room.id
              },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            });

            // Broadcast to all clients in the room including sender
            const broadcastMessage = {
              type: 'new-message',
              message: {
                id: savedMessage.id,
                message: savedMessage.message,
                senderId: savedMessage.user.id,
                senderName: savedMessage.user.name,
                senderEmail: savedMessage.user.email,
                createdAt: savedMessage.createdAt.toISOString()
              }
            };

            broadcastToRoomAll(roomId, broadcastMessage);
            
            break;
          }

          case 'leave-room': {
            if (ws.roomId) {
              const roomId = ws.roomId;
              const clients = roomConnections.get(roomId);
              if (clients) {
                clients.delete(ws);
                if (clients.size === 0) {
                  roomConnections.delete(roomId);
                }
              }
              
              // Notify others
              broadcastToRoom(roomId, {
                type: 'user-left',
                userId: ws.userId
              }, ws);

              ws.roomId = undefined;
              ws.send(JSON.stringify({ type: 'left-room' }));
            }
            break;
          }

          default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
        }
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
      }
    });

    ws.on('close', () => {
      console.log(`Client disconnected: User ${ws.userId}`);
      
      // Remove from room connections
      if (ws.roomId) {
        const clients = roomConnections.get(ws.roomId);
        if (clients) {
          clients.delete(ws);
          if (clients.size === 0) {
            roomConnections.delete(ws.roomId);
          }
        }
        
        // Notify others
        broadcastToRoom(ws.roomId, {
          type: 'user-left',
          userId: ws.userId
        }, ws);
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
