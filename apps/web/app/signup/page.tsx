'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../lib/api';
import { Container } from '@repo/ui/container';
import { Input } from '@repo/ui/input';
import { Button } from '@repo/ui/button';
import { Label } from '@repo/ui/label';
import { Link } from '@repo/ui/link';
import { ThemeToggle } from '../../components/ThemeToggle';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.signup(name, email, password);
      const { token } = await api.signin(email, password);
      login(token);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ThemeToggle />
      <Container maxWidth="400px" mode={theme} style={{ marginTop: '100px' }}>
        <h1 style={{ marginBottom: '30px', fontSize: '32px', fontWeight: '700' }}>Sign Up</h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <Label htmlFor="name" mode={theme}>Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              mode={theme}
              placeholder="Enter your name"
            />
          </div>
          <div>
            <Label htmlFor="email" mode={theme}>Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              mode={theme}
              placeholder="Enter your email"
            />
          </div>
          <div>
            <Label htmlFor="password" mode={theme}>Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              mode={theme}
              placeholder="Enter your password"
            />
          </div>
          {error && <p style={{ color: '#dc3545', fontSize: '14px' }}>{error}</p>}
          <Button type="submit" disabled={loading} variant="primary" mode={theme} style={{ width: '100%' }}>
            {loading ? 'Signing up...' : 'Sign Up'}
          </Button>
        </form>
        <p style={{ marginTop: '20px', textAlign: 'center' }}>
          Already have an account?{' '}
          <NextLink href="/signin" style={{ color: '#0070f3', textDecoration: 'none' }}>
            Sign In
          </NextLink>
        </p>
      </Container>
    </>
  );
}
