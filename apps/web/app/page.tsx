'use client';

import NextLink from 'next/link';
import { useTheme } from '../contexts/ThemeContext';
import { Container } from '@repo/ui/container';
import { Button } from '@repo/ui/button';
import { ThemeToggle } from '../components/ThemeToggle';

export default function Home() {
  const { theme } = useTheme();
  
  return (
    <>
      <ThemeToggle />
      <Container maxWidth="600px" mode={theme} style={{ marginTop: '100px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '36px', marginBottom: '20px', fontWeight: '700' }}>
          Welcome to Excalidraw Clone
        </h1>
        <p style={{ margin: '20px 0', fontSize: '18px', opacity: 0.8 }}>
          A collaborative drawing and chat application
        </p>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '40px' }}>
          <NextLink href="/signin">
            <Button variant="primary" size="lg" mode={theme}>
              Sign In
            </Button>
          </NextLink>
          <NextLink href="/signup">
            <Button variant="secondary" size="lg" mode={theme}>
              Sign Up
            </Button>
          </NextLink>
        </div>
      </Container>
    </>
  );
}