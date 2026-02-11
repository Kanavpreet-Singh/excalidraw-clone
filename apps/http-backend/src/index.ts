import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import roomRoutes from "./routes/room";
import messageRoutes from "./routes/message";
import diagramRoutes from "./routes/diagram";

const app = express();
const PORT = 3001;

const allowedOrigins = [
  'http://localhost:3000',                      // local dev
  'https://staging.structura-fe.testingdemo.me', // staging frontend
  'https://structura-fe.testingdemo.me'         // production frontend
];

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, origin);  // explicitly return the matching origin
    }
    const msg = `CORS policy does not allow access from origin: ${origin}`;
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'token']
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
app.use("/api", diagramRoutes);

app.listen(PORT, () => {
  console.log(`HTTP server running on http://localhost:${PORT}`);
});