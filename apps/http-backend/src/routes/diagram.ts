import { Router, type Router as RouterType, Request, Response } from "express";

const router: RouterType = Router();

interface DiagramRequest {
  prompt: string;
}

interface DiagramElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string | null;
  fontSize: number;
}

interface DiagramResponse {
  diagram: DiagramElement[];
}

router.post("/generate-diagram", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body as DiagramRequest;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const aiApiBaseUrl = process.env.AI_API_BASE_URL || "http://127.0.0.1:8000";
    
    // Call the AI service
    const response = await fetch(`${aiApiBaseUrl}/generate-diagram`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`AI service returned status ${response.status}`);
    }

    const data = await response.json() as DiagramResponse;
    
    res.json(data);
  } catch (error) {
    console.error("Error generating diagram:", error);
    res.status(500).json({ 
      error: "Failed to generate diagram",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;
