'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';
import Link from 'next/link';

export default function JoinRoomPage() {
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { token } = useAuth();
  const router = useRouter();

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setError('');
    setLoading(true);

    try {
      await api.joinRoom(token, roomId);
      router.push(`/room/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '100px auto', padding: '20px' }}>
      <Link href="/dashboard" style={{ textDecoration: 'none', color: '#0070f3' }}>← Back to Dashboard</Link>
      
      <h1 style={{ marginTop: '30px' }}>Join a Room</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Enter the room code to join an existing collaborative session.
      </p>

      <form onSubmit={handleJoinRoom} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label htmlFor="roomId" style={{ display: 'block', marginBottom: '8px' }}>Room Code</label>
          <input
            id="roomId"
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            required
            placeholder="Enter room code (UUID)"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '5px'
            }}
          />
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '15px',
            background: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Joining...' : 'Join Room'}
        </button>
      </form>
    </div>
  );
}
