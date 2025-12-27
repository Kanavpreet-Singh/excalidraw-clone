import  { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

const wss = new WebSocketServer({ port: 8080 });
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

wss.on('connection', (ws, req) => {
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
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Client connected');
    console.log('Decoded token:', decoded);

    ws.on('message', (message) => {
      console.log('Received:', message.toString());
      ws.send('Hello from server');
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  } catch (error) {
    console.log('Connection rejected: Invalid token', error);
    ws.close(1008, 'Invalid token');
    return;
  }
});
