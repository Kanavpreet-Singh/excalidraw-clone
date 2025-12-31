'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface WebSocketContextType {
  ws: WebSocket | null;
  isConnected: boolean;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  sendMessage: (roomId: string, message: string) => void;
  onMessage: (callback: (message: WebSocketMessage) => void) => void;
  offMessage: (callback: (message: WebSocketMessage) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

const WS_URL = 'ws://localhost:8080';

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messageCallbacks = useRef<Set<(message: WebSocketMessage) => void>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token) {
      // Close connection if token is removed
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        setWs(null);
        setIsConnected(false);
      }
      return;
    }

    // Connect to WebSocket server
    const connectWebSocket = () => {
      try {
        const websocket = new WebSocket(`${WS_URL}?token=${token}`);
        
        websocket.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          wsRef.current = websocket;
          setWs(websocket);
        };

        websocket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('WebSocket message received:', message);
            
            // Notify all registered callbacks
            messageCallbacks.current.forEach(callback => {
              callback(message);
            });
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        websocket.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        websocket.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          wsRef.current = null;
          setWs(null);

          // Attempt to reconnect after 3 seconds
          if (token) {
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('Attempting to reconnect...');
              connectWebSocket();
            }, 3000);
          }
        };
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token]);

  const joinRoom = (roomId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'join-room', roomId }));
    }
  };

  const leaveRoom = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'leave-room' }));
    }
  };

  const sendMessage = (roomId: string, message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'send-message', 
        roomId,
        message 
      }));
    }
  };

  const onMessage = (callback: (message: WebSocketMessage) => void) => {
    messageCallbacks.current.add(callback);
  };

  const offMessage = (callback: (message: WebSocketMessage) => void) => {
    messageCallbacks.current.delete(callback);
  };

  return (
    <WebSocketContext.Provider value={{
      ws,
      isConnected,
      joinRoom,
      leaveRoom,
      sendMessage,
      onMessage,
      offMessage
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
