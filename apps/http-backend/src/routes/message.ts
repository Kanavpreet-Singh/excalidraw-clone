import { Router, type Router as RouterType } from "express";
import { authMiddleware } from "../middlewares/auth";
import { prisma } from "@repo/db";

const router: RouterType = Router();

// Get all shapes in a room (initial load for new users joining)
router.get("/room/:roomId/shapes", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const { roomId } = req.params;

    // Check if room exists
    const room = await prisma.room.findUnique({
      where: { roomId },
      select: { id: true, shapes: true, userId: true }
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Check if user is admin or member of the room
    const isAdmin = room.userId === user.userId;
    const member = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: user.userId,
          roomId: room.id
        }
      }
    });

    if (!isAdmin && !member) {
      return res.status(403).json({ error: "You are not a member of this room" });
    }

    res.json({
      shapes: room.shapes || []
    });
  } catch (error) {
    console.error("Get shapes error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
