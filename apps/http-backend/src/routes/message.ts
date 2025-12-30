import { Router, type Router as RouterType } from "express";
import { authMiddleware } from "../middlewares/auth";
import { prisma } from "@repo/db";

const router: RouterType = Router();

// Send message endpoint
router.post("/send-message", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const { roomId, message } = req.body;

    if (!roomId || !message) {
      return res.status(400).json({ error: "Room ID and message are required" });
    }

    // Check if room exists
    const room = await prisma.room.findUnique({
      where: { roomId }
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

    // Create the message
    const chat = await prisma.chat.create({
      data: {
        message,
        userId: user.userId,
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
      }
    });

    res.status(201).json({
      message: "Message sent successfully",
      chat: {
        id: chat.id,
        message: chat.message,
        sender: chat.user.name,
        createdAt: chat.createdAt
      }
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all messages in a room
router.get("/room/:roomId/messages", authMiddleware, async (req, res) => {
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

    // Fetch all messages with sender information
    const messages = await prisma.chat.findMany({
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
        createdAt: 'asc'
      }
    });

    res.status(200).json({
      roomId: room.roomId,
      messages: messages.map(msg => ({
        id: msg.id,
        message: msg.message,
        senderId: msg.user.id,
        senderName: msg.user.name,
        senderEmail: msg.user.email,
        createdAt: msg.createdAt
      }))
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
