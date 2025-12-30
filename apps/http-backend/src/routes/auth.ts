import { Router, type Router as RouterType } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@repo/db";

const router: RouterType = Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Signup endpoint
router.post("/signup", async (req, res) => {
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
router.post("/signin", async (req, res) => {
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

export default router;
