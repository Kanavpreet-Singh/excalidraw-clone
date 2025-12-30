const API_URL = 'http://localhost:3001/api';

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Room {
  roomId: string;
  adminId: number;
}

export interface Message {
  id: number;
  message: string;
  senderId: number;
  senderName: string;
  senderEmail: string;
  createdAt: string;
}

export interface RoomMember {
  id: number;
  name: string;
  email: string;
  joinedAt: string;
  isAdmin: boolean;
}

export const api = {
  // Auth
  signup: async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  signin: async (email: string, password: string): Promise<{ token: string }> => {
    const res = await fetch(`${API_URL}/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Rooms
  createRoom: async (token: string): Promise<Room> => {
    const res = await fetch(`${API_URL}/create-room`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token
      }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  joinRoom: async (token: string, roomId: string) => {
    const res = await fetch(`${API_URL}/join-room`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token
      },
      body: JSON.stringify({ roomId })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  leaveRoom: async (token: string, roomId: string) => {
    const res = await fetch(`${API_URL}/leave-room/${roomId}`, {
      method: 'DELETE',
      headers: {
        'token': token
      }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Messages
  sendMessage: async (token: string, roomId: string, message: string) => {
    const res = await fetch(`${API_URL}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token
      },
      body: JSON.stringify({ roomId, message })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getMessages: async (token: string, roomId: string): Promise<{ messages: Message[] }> => {
    const res = await fetch(`${API_URL}/room/${roomId}/messages`, {
      headers: {
        'token': token
      }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getMembers: async (token: string, roomId: string): Promise<{ members: RoomMember[] }> => {
    const res = await fetch(`${API_URL}/room/${roomId}/members`, {
      headers: {
        'token': token
      }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};
