import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.token as string;

    if (!token) {
      return res.status(401).json({ error: "Token not provided" });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach decoded user info to request
    (req as any).user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};
