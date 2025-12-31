import { Router, type Router as RouterType } from "express";
import { authMiddleware } from "../middlewares/auth";
import { prisma } from "@repo/db";

const router: RouterType = Router();

// Get all rooms created by the current user
router.get("/my-rooms", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;

    // Fetch all rooms created by this user
    const rooms = await prisma.room.findMany({
      where: {
        userId: user.userId
      },
      include: {
        _count: {
          select: {
            members: true,
            chats: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.status(200).json({
      rooms: rooms.map(room => ({
        id: room.id,
        roomId: room.roomId,
        memberCount: room._count.members,
        messageCount: room._count.chats,
        createdAt: room.createdAt
      }))
    });
  } catch (error) {
    console.error("Get my rooms error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create room endpoint
router.post("/create-room", authMiddleware, async (req, res) => {
  try {
    // Get user info from auth middleware
    const user = (req as any).user;
    
    // Create room in database with owner as admin
    const room = await prisma.room.create({
      data: {
        userId: user.userId,
      }
    });

    // Automatically add creator as a member
    await prisma.roomMember.create({
      data: {
        userId: user.userId,
        roomId: room.id
      }
    });

    res.status(201).json({
      message: "Room created successfully",
      roomId: room.roomId,
      adminId: user.userId
    });
  } catch (error) {
    console.error("Create room error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Join room endpoint
router.post("/join-room", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: "Room ID is required" });
    }

    // Check if room exists
    const room = await prisma.room.findUnique({
      where: { roomId }
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Check if user is already a member
    const existingMember = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: user.userId,
          roomId: room.id
        }
      }
    });

    if (existingMember) {
      return res.status(400).json({ error: "You are already a member of this room" });
    }

    // Add user as a member
    await prisma.roomMember.create({
      data: {
        userId: user.userId,
        roomId: room.id
      }
    });

    res.status(200).json({
      message: "Successfully joined the room",
      roomId: room.roomId
    });
  } catch (error) {
    console.error("Join room error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all members in a room
router.get("/room/:roomId/members", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const { roomId } = req.params;

    // Check if room exists
    const room = await prisma.room.findUnique({
      where: { roomId },
      include: {
        admin: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Check if user is a member of the room
    const member = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: user.userId,
          roomId: room.id
        }
      }
    });

    if (!member) {
      return res.status(403).json({ error: "You are not a member of this room" });
    }

    // Fetch all members
    const members = await prisma.roomMember.findMany({
      where: {
        roomId: room.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        joinedAt: 'asc'
      }
    });

    res.status(200).json({
      roomId: room.roomId,
      adminId: room.userId,
      adminName: room.admin.name,
      members: members.map(m => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        joinedAt: m.joinedAt,
        isAdmin: m.user.id === room.userId
      }))
    });
  } catch (error) {
    console.error("Get members error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Leave room endpoint
router.delete("/leave-room/:roomId", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const { roomId } = req.params;

    // Check if room exists
    const room = await prisma.room.findUnique({
      where: { roomId }
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Check if user is a member
    const member = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: user.userId,
          roomId: room.id
        }
      }
    });

    if (!member) {
      return res.status(400).json({ error: "You are not a member of this room" });
    }

    // Check if user is admin
    if (room.userId === user.userId) {
      return res.status(403).json({ error: "Room admin cannot leave the room" });
    }

    // Remove user from room
    await prisma.roomMember.delete({
      where: {
        userId_roomId: {
          userId: user.userId,
          roomId: room.id
        }
      }
    });

    res.status(200).json({
      message: "Successfully left the room",
      roomId: room.roomId
    });
  } catch (error) {
    console.error("Leave room error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete room endpoint (only room admin can delete)
router.delete("/delete-room/:roomId", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const { roomId } = req.params;

    // Check if room exists
    const room = await prisma.room.findUnique({
      where: { roomId }
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Check if user is the admin of the room
    if (room.userId !== user.userId) {
      return res.status(403).json({ error: "Only the room admin can delete the room" });
    }

    // Delete the room (cascading deletes will handle RoomMember and Chat entries)
    await prisma.room.delete({
      where: { roomId }
    });

    res.status(200).json({
      message: "Room deleted successfully",
      roomId: room.roomId
    });
  } catch (error) {
    console.error("Delete room error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
