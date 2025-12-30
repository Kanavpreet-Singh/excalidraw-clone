import "dotenv/config";
import express from "express";
import authRoutes from "./routes/auth";
import roomRoutes from "./routes/room";
import messageRoutes from "./routes/message";

const app = express();
const PORT = 3001;

app.use(express.json());
console.log("DATABASE_URL:", process.env.DATABASE_URL);

app.get("/", (req, res) => {
  res.json({ message: "Hello from HTTP backend" });
});

// Mount routes
app.use("/api", authRoutes);
app.use("/api", roomRoutes);
app.use("/api", messageRoutes);

app.listen(PORT, () => {
  console.log(`HTTP server running on http://localhost:${PORT}`);
});