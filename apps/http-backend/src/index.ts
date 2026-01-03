import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import roomRoutes from "./routes/room";
import messageRoutes from "./routes/message";

const app = express();
const PORT = 3001;

const allowedOrigins = [
  'http://localhost:3000',                 // local dev
  'https://structura-fe.testingdemo.me'    // production frontend
];

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin.`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

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