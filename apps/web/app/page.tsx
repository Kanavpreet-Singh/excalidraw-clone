import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ maxWidth: '600px', margin: '100px auto', padding: '20px', textAlign: 'center' }}>
      <h1>Welcome to Excalidraw Clone</h1>
      <p style={{ margin: '20px 0' }}>A collaborative drawing and chat application</p>
      <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '40px' }}>
        <Link href="/signin" style={{ padding: '12px 24px', background: '#0070f3', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>
          Sign In
        </Link>
        <Link href="/signup" style={{ padding: '12px 24px', background: '#666', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>
          Sign Up
        </Link>
      </div>
    </div>
  );
}