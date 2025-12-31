'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { api } from '../../../lib/api';
import { Container } from '@repo/ui/container';
import { Input } from '@repo/ui/input';
import { Button } from '@repo/ui/button';
import { Label } from '@repo/ui/label';
import { Link } from '@repo/ui/link';
import { ThemeToggle } from '../../../components/ThemeToggle';

export default function JoinRoomPage() {
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { token } = useAuth();
  const { theme } = useTheme();
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
    <>
      <ThemeToggle />
      <Container maxWidth="600px" mode={theme} style={{ marginTop: '100px' }}>
        <NextLink href="/dashboard" style={{ color: '#0070f3', textDecoration: 'none' }}>
          ← Back to Dashboard
        </NextLink>
        
        <h1 style={{ marginTop: '30px', fontSize: '32px', fontWeight: '700' }}>Join a Room</h1>
        <p style={{ opacity: 0.8, marginBottom: '30px' }}>
          Enter the room code to join an existing collaborative session.
        </p>

        <form onSubmit={handleJoinRoom} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <Label htmlFor="roomId" mode={theme}>Room Code</Label>
            <Input
              id="roomId"
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              required
              placeholder="Enter room code (UUID)"
              mode={theme}
            />
          </div>

          {error && <p style={{ color: '#dc3545' }}>{error}</p>}

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            mode={theme}
            style={{ padding: '15px', fontSize: '16px' }}
          >
            {loading ? 'Joining...' : 'Join Room'}
          </Button>
        </form>
      </Container>
    </>
  );
}
