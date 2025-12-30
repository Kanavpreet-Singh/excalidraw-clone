'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { api, type Message, type RoomMember } from '../../../lib/api';

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar - Members */}
      <div style={{ width: '250px', background: '#f8f9fa', padding: '20px', borderRight: '1px solid #dee2e6', overflowY: 'auto' }}>
        <h3 style={{ marginBottom: '20px' }}>Members ({members.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {members.map(member => (
            <div key={member.id} style={{ padding: '10px', background: 'white', borderRadius: '5px', fontSize: '14px' }}>
              <div style={{ fontWeight: 'bold' }}>
                {member.name} {member.isAdmin && '👑'}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>{member.email}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #dee2e6', background: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0 }}>Room</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                <code style={{ fontSize: '12px', background: '#f8f9fa', padding: '4px 8px', borderRadius: '3px' }}>
                  {roomId}
                </code>
                <button
                  onClick={copyRoomId}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    background: copied ? '#28a745' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => router.push('/dashboard')}
                style={{
                  padding: '8px 16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Dashboard
              </button>
              <button
                onClick={handleLeaveRoom}
                style={{
                  padding: '8px 16px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#f8f9fa' }}>
          {messages.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666' }}>No messages yet. Start the conversation!</p>
          ) : (
            messages.map(msg => (
              <div key={msg.id} style={{ marginBottom: '15px', background: 'white', padding: '12px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontWeight: 'bold', color: '#0070f3' }}>{msg.senderName}</span>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div>{msg.message}</div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div style={{ padding: '20px', background: 'white', borderTop: '1px solid #dee2e6' }}>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid #dee2e6',
                borderRadius: '5px',
                fontSize: '14px'
              }}
            />
            <button
              type="submit"
              disabled={loading || !newMessage.trim()}
              style={{
                padding: '12px 24px',
                background: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: loading || !newMessage.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !newMessage.trim() ? 0.6 : 1
              }}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </form>
          {error && <p style={{ color: 'red', marginTop: '10px', fontSize: '14px' }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
