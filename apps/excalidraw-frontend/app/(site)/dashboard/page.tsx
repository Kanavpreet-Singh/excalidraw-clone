"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { config } from "@/config";

interface User {
  name: string;
  email: string;
  userId: number;
}

interface Room {
  id: number;
  roomId: string;
  memberCount: number;
  createdAt: string;
}

// API Functions
async function createRoom(token: string): Promise<{ roomId: string } | null> {
  try {
    const response = await fetch(`${config.API_URL}/api/create-room`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: token,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to create room");
    }

    return await response.json();
  } catch (error) {
    console.error("Create room error:", error);
    throw error;
  }
}

async function joinRoom(token: string, roomId: string): Promise<{ roomId: string } | null> {
  try {
    const response = await fetch(`${config.API_URL}/api/join-room`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: token,
      },
      body: JSON.stringify({ roomId }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to join room");
    }

    return await response.json();
  } catch (error) {
    console.error("Join room error:", error);
    throw error;
  }
}

async function getMyRooms(token: string): Promise<Room[]> {
  try {
    const response = await fetch(`${config.API_URL}/api/my-rooms`, {
      method: "GET",
      headers: {
        token: token,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch rooms");
    }

    const data = await response.json();
    return data.rooms || [];
  } catch (error) {
    console.error("Get rooms error:", error);
    return [];
  }
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.replace("/signin");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchRooms(token);
    } catch {
      router.replace("/signin");
    }
  }, [router]);

  const fetchRooms = async (token: string) => {
    setLoading(true);
    const fetchedRooms = await getMyRooms(token);
    setRooms(fetchedRooms);
    setLoading(false);
  };

  const handleCreateRoom = async () => {
    setError("");
    setSuccess("");
    setActionLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const result = await createRoom(token);
      if (result?.roomId) {
        setSuccess(`Room created! ID: ${result.roomId}`);
        fetchRooms(token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!joinRoomId.trim()) {
      setError("Please enter a room ID");
      return;
    }

    setActionLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const result = await joinRoom(token, joinRoomId.trim());
      if (result?.roomId) {
        setSuccess(`Successfully joined room!`);
        setJoinRoomId("");
        router.push(`/canvas/${result.roomId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRoom = (roomId: string) => {
    router.push(`/canvas/${roomId}`);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Info Card */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{user?.name}</h1>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-4 mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-primary/10 border border-primary/30 text-primary rounded-lg p-4 mb-6">
            {success}
          </div>
        )}

        {/* Actions Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Create Room Card */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground">Create Room</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Start a new collaborative canvas and invite others to join.
            </p>
            <button
              onClick={handleCreateRoom}
              disabled={actionLoading}
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? "Creating..." : "Create New Room"}
            </button>
          </div>

          {/* Join Room Card */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground">Join Room</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Enter a room ID to join an existing canvas.
            </p>
            <form onSubmit={handleJoinRoom} className="space-y-3">
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="Enter Room ID"
                className="w-full px-4 py-3 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? "Joining..." : "Join Room"}
              </button>
            </form>
          </div>
        </div>

        {/* My Rooms Section */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">My Rooms</h2>
          
          {rooms.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-muted-foreground">No rooms yet. Create your first room to get started!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-4 bg-background border border-border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground font-mono text-sm">
                      {room.roomId}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        {room.memberCount} members
                      </span>
                      <span>
                        Created {new Date(room.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenRoom(room.roomId)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
