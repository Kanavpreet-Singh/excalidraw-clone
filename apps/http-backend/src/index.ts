import express from "express";

const app = express();
const PORT = 3001;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Hello from HTTP backend" });
});

app.listen(PORT, () => {
  console.log(`HTTP server running on http://localhost:${PORT}`);
});