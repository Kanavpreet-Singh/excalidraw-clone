import "dotenv/config";
import express from "express";
import jwt from "jsonwebtoken";
import { authMiddleware } from "./middlewares/auth";
import { prisma } from "@repo/db";

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

app.use(express.json());
console.log("DATABASE_URL:", process.env.DATABASE_URL);


app.get("/", (req, res) => {
  res.json({ message: "Hello from HTTP backend" });
});

// Signup endpoint
app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Save user to database
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password // Note: In production, hash this password
      }
    });

    res.status(201).json({ 
      message: "User created successfully",
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Signin endpoint
app.post("/api/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user from database
    const user = await prisma.user.findUnique({ 
      where: { email } 
    });
    
    // Verify user exists
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    if (user.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({ 
      message: "Signin successful",
      token 
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create room endpoint
app.post("/api/create-room", authMiddleware, async (req, res) => {
  try {
    // Get user info from auth middleware
    const user = (req as any).user;
    
    // Generate random 4-digit room ID
    let roomId = Math.floor(1000 + Math.random() * 9000).toString();

    // Check if roomId already exists in database, regenerate if needed
    let exists = await prisma.room.findUnique({ where: { roomId } });
    while (exists) {
      roomId = Math.floor(1000 + Math.random() * 9000).toString();
      exists = await prisma.room.findUnique({ where: { roomId } });
    }

    // Store room in database with owner's userId
    const room = await prisma.room.create({
      data: {
        roomId,
        userId: user.userId,
      }
    });

    res.status(201).json({
      message: "Room created successfully",
      roomId: room.roomId,
      ownerId: user.userId
    });
  } catch (error) {
    console.error("Create room error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`HTTP server running on http://localhost:${PORT}`);
});