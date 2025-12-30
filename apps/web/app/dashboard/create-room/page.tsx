'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';
import Link from 'next/link';

export default function CreateRoomPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { token } = useAuth();
  const router = useRouter();

  const handleCreateRoom = async () => {
    if (!token) return;
    
    setError('');
    setLoading(true);

    try {
      const result = await api.createRoom(token);
      router.push(`/room/${result.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '100px auto', padding: '20px' }}>
      <Link href="/dashboard" style={{ textDecoration: 'none', color: '#0070f3' }}>← Back to Dashboard</Link>
      
      <h1 style={{ marginTop: '30px' }}>Create a New Room</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Create a new collaborative room. You'll be able to share the room code with others.
      </p>

      {error && <p style={{ color: 'red', marginBottom: '20px' }}>{error}</p>}

      <button
        onClick={handleCreateRoom}
        disabled={loading}
        style={{
          width: '100%',
          padding: '15px',
          background: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          fontSize: '16px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Creating Room...' : 'Create Room'}
      </button>
    </div>
  );
}
