import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;

    if (!key) {
      throw new Error(
        "GEMINI_API_KEY environment variable is required"
      );
    }

    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  return aiClient;
}

// ========================================
// START SERVER
// ========================================

async function startServer() {
  const app = express();

  app.use(express.json());

  // ========================================
  // HEALTH CHECK ROUTE
  // ========================================

  app.get("/api/health", (req, res) => {
    res.json({
      success: true,
      message: "BiteFlow API is running",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    });
  });

  // ========================================
  // YOUR EXISTING ROUTES HERE
  // ========================================

  // Example:
  // app.post("/api/auth/login", ...)
  // app.get("/api/restaurants", ...)
  // app.post("/api/orders", ...)
  // etc...

  // ========================================
  // DEVELOPMENT MODE (VITE)
  // ========================================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: "spa",
    });

    app.use(vite.middlewares);
  }

  // ========================================
  // PRODUCTION MODE
  // ========================================

  else {
    const distPath = path.join(process.cwd(), "dist");

    app.use(express.static(distPath));

    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // ========================================
  // PORT CONFIGURATION
  // ========================================

  const PORT = Number(process.env.PORT) || 3000;

  // ========================================
  // START LISTENING
  // ========================================

  app.listen(PORT, () => {
    console.log("=================================");
    console.log("✅ BiteFlow Server Started");
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🚀 Running on port: ${PORT}`);
    console.log("=================================");
  });
}

// ========================================
// START APPLICATION
// ========================================

startServer().catch((error) => {
  console.error("❌ Failed to start server");
  console.error(error);

  process.exit(1);
});
