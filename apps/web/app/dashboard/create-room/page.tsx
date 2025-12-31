'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { api } from '../../../lib/api';
import { Container } from '@repo/ui/container';
import { Button } from '@repo/ui/button';
import { Link } from '@repo/ui/link';
import { ThemeToggle } from '../../../components/ThemeToggle';

export default function CreateRoomPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { token } = useAuth();
  const { theme } = useTheme();
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
    <>
      <ThemeToggle />
      <Container maxWidth="600px" mode={theme} style={{ marginTop: '100px' }}>
        <NextLink href="/dashboard" style={{ color: '#0070f3', textDecoration: 'none' }}>
          ← Back to Dashboard
        </NextLink>
        
        <h1 style={{ marginTop: '30px', fontSize: '32px', fontWeight: '700' }}>Create a New Room</h1>
        <p style={{ opacity: 0.8, marginBottom: '30px' }}>
          Create a new collaborative room. You'll be able to share the room code with others.
        </p>

        {error && <p style={{ color: '#dc3545', marginBottom: '20px' }}>{error}</p>}

        <Button
          onClick={handleCreateRoom}
          disabled={loading}
          variant="primary"
          mode={theme}
          style={{ width: '100%', padding: '15px', fontSize: '16px' }}
        >
          {loading ? 'Creating Room...' : 'Create Room'}
        </Button>
      </Container>
    </>
  );
}
