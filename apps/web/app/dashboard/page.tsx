'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Container } from '@repo/ui/container';
import { Button } from '@repo/ui/button';
import { Card } from '@repo/ui/card';
import { ThemeToggle } from '../../components/ThemeToggle';

export default function DashboardPage() {
  const { isAuthenticated, logout } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, router]);

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
      </Container>
    </>
  );
}
