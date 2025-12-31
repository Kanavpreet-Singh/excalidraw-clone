'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Container } from '@repo/ui/container';
import { Button } from '@repo/ui/button';
import { Card } from '@repo/ui/card';
import { ThemeToggle } from '../../components/ThemeToggle';
import { api, type MyRoom } from '../../lib/api';

export default function DashboardPage() {
  const { isAuthenticated, logout, token } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [myRooms, setMyRooms] = useState<MyRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const fetchMyRooms = async () => {
      if (!token) return;
      try {
        const data = await api.getMyRooms(token);
        setMyRooms(data.rooms);
      } catch (err) {
        console.error('Error fetching rooms:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && token) {
      fetchMyRooms();
    }
  }, [isAuthenticated, token]);

  const handleDeleteRoom = async (roomId: string) => {
    if (!token) return;
    
    if (confirm('Are you sure you want to delete this room? This will remove all messages and members permanently.')) {
      try {
        await api.deleteRoom(token, roomId);
        // Refresh the list
        const data = await api.getMyRooms(token);
        setMyRooms(data.rooms);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete room');
      }
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <ThemeToggle />
      <Container maxWidth="800px" mode={theme} style={{ marginTop: '50px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '700' }}>Dashboard</h1>
          <Button 
            onClick={logout}
            variant="danger"
            mode={theme}
          >
            Logout
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <NextLink href="/dashboard/create-room" style={{ textDecoration: 'none' }}>
            <Card
              title="Create Room"
              mode={theme}
              onClick={() => {}}
              style={{ height: '100%', cursor: 'pointer' }}
            >
              <p style={{ opacity: 0.8 }}>Start a new collaborative session</p>
            </Card>
          </NextLink>

          <NextLink href="/dashboard/join-room" style={{ textDecoration: 'none' }}>
            <Card
              title="Join Room"
              mode={theme}
              onClick={() => {}}
              style={{ height: '100%', cursor: 'pointer' }}
            >
              <p style={{ opacity: 0.8 }}>Enter a room code to join</p>
            </Card>
          </NextLink>
        </div>

        {/* My Rooms Section */}
        <div style={{ marginTop: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px' }}>My Rooms</h2>
          {loading ? (
            <p style={{ opacity: 0.6 }}>Loading your rooms...</p>
          ) : myRooms.length === 0 ? (
            <Card mode={theme}>
              <p style={{ opacity: 0.6, textAlign: 'center', padding: '20px' }}>
                You haven't created any rooms yet. Click "Create Room" to get started!
              </p>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {myRooms.map(room => (
                <Card key={room.id} mode={theme} style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <code style={{ 
                          fontSize: '14px', 
                          fontWeight: '600',
                          background: theme === 'dark' ? '#374151' : '#f8f9fa',
                          color: theme === 'dark' ? '#e5e7eb' : '#374151',
                          padding: '4px 8px', 
                          borderRadius: '3px' 
                        }}>
                          {room.roomId}
                        </code>
                        <span style={{ fontSize: '12px', opacity: 0.6 }}>
                          Created {new Date(room.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', opacity: 0.8 }}>
                        {room.memberCount} member{room.memberCount !== 1 ? 's' : ''} • {room.messageCount} message{room.messageCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <Button
                        onClick={() => router.push(`/room/${room.roomId}`)}
                        variant="primary"
                        mode={theme}
                      >
                        Enter Room
                      </Button>
                      <Button
                        onClick={() => handleDeleteRoom(room.roomId)}
                        variant="danger"
                        mode={theme}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Container>
    </>
  );
}
