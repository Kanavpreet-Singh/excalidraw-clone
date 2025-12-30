'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';

export default function DashboardPage() {
  const { isAuthenticated, logout } = useAuth();
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
    <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1>Dashboard</h1>
        <button 
          onClick={logout}
          style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Link 
          href="/dashboard/create-room"
          style={{ 
            padding: '40px', 
            background: '#f8f9fa', 
            border: '2px solid #dee2e6',
            borderRadius: '10px', 
            textDecoration: 'none', 
            color: '#000',
            textAlign: 'center',
            transition: 'all 0.2s'
          }}
        >
          <h2>Create Room</h2>
          <p>Start a new collaborative session</p>
        </Link>

        <Link 
          href="/dashboard/join-room"
          style={{ 
            padding: '40px', 
            background: '#f8f9fa', 
            border: '2px solid #dee2e6',
            borderRadius: '10px', 
            textDecoration: 'none', 
            color: '#000',
            textAlign: 'center',
            transition: 'all 0.2s'
          }}
        >
          <h2>Join Room</h2>
          <p>Enter a room code to join</p>
        </Link>
      </div>
    </div>
  );
}
