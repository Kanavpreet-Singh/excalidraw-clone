'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { api, type Message, type RoomMember } from '../../../lib/api';
import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';
import { Card } from '@repo/ui/card';
import { ThemeToggle } from '../../../components/ThemeToggle';

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { token, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isDark = theme === 'dark';

  // Fetch messages
  const fetchMessages = async () => {
    if (!token) return;
    try {
      const data = await api.getMessages(token, roomId);
      setMessages(data.messages);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  // Fetch members
  const fetchMembers = async () => {
    if (!token) return;
    try {
      const data = await api.getMembers(token, roomId);
      setMembers(data.members);
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  // Initial load
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin');
      return;
    }

    fetchMessages();
    fetchMembers();

    // Poll for new messages every 2 seconds
    pollingIntervalRef.current = setInterval(() => {
      fetchMessages();
    }, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isAuthenticated, token, roomId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newMessage.trim()) return;

    setLoading(true);
    setError('');

    try {
      await api.sendMessage(token, roomId, newMessage);
      setNewMessage('');
      await fetchMessages(); // Immediately refresh messages
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!token) return;
    
    if (confirm('Are you sure you want to leave this room?')) {
      try {
        await api.leaveRoom(token, roomId);
        router.push('/dashboard');
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to leave room');
      }
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <ThemeToggle />
      <div style={{ display: 'flex', height: '100vh' }}>
        {/* Sidebar - Members */}
        <div style={{ 
          width: '250px', 
          background: isDark ? '#1f2937' : '#f8f9fa', 
          padding: '20px', 
          borderRight: `1px solid ${isDark ? '#374151' : '#dee2e6'}`, 
          overflowY: 'auto' 
        }}>
          <h3 style={{ marginBottom: '20px', color: isDark ? '#f3f4f6' : '#1f2937' }}>
            Members ({members.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {members.map(member => (
              <Card key={member.id} mode={theme} style={{ padding: '10px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                  {member.name} {member.isAdmin && '👑'}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>{member.email}</div>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ 
            padding: '20px', 
            borderBottom: `1px solid ${isDark ? '#374151' : '#dee2e6'}`, 
            background: isDark ? '#1f2937' : 'white' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, color: isDark ? '#f3f4f6' : '#1f2937' }}>Room</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                  <code style={{ 
                    fontSize: '12px', 
                    background: isDark ? '#374151' : '#f8f9fa', 
                    color: isDark ? '#e5e7eb' : '#374151',
                    padding: '4px 8px', 
                    borderRadius: '3px' 
                  }}>
                    {roomId}
                  </code>
                  <Button
                    onClick={copyRoomId}
                    size="sm"
                    variant={copied ? 'success' : 'secondary'}
                    mode={theme}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                  onClick={() => router.push('/dashboard')}
                  variant="secondary"
                  mode={theme}
                >
                  Dashboard
                </Button>
                <Button
                  onClick={handleLeaveRoom}
                  variant="danger"
                  mode={theme}
                >
                  Leave Room
                </Button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '20px', 
            background: isDark ? '#0a0a0a' : '#f8f9fa' 
          }}>
            {messages.length === 0 ? (
              <p style={{ textAlign: 'center', opacity: 0.6 }}>
                No messages yet. Start the conversation!
              </p>
            ) : (
              messages.map(msg => (
                <Card key={msg.id} mode={theme} style={{ marginBottom: '15px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontWeight: 'bold', color: '#0070f3' }}>{msg.senderName}</span>
                    <span style={{ fontSize: '12px', opacity: 0.6 }}>
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div>{msg.message}</div>
                </Card>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div style={{ 
            padding: '20px', 
            background: isDark ? '#1f2937' : 'white', 
            borderTop: `1px solid ${isDark ? '#374151' : '#dee2e6'}` 
          }}>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
              <Input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                mode={theme}
                style={{ flex: 1 }}
              />
              <Button
                type="submit"
                disabled={loading || !newMessage.trim()}
                variant="primary"
                mode={theme}
                style={{ padding: '12px 24px' }}
              >
                {loading ? 'Sending...' : 'Send'}
              </Button>
            </form>
            {error && <p style={{ color: '#dc3545', marginTop: '10px', fontSize: '14px' }}>{error}</p>}
          </div>
        </div>
      </div>
    </>
  );
}
