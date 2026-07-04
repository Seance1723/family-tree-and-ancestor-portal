import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set limits to support base64 historical images/documents in uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // AI-Powered Ancestral Match Checker
  app.post("/api/match-ancestors", async (req, res) => {
    try {
      const { userMembers, publicMembers } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "Gemini API key is not configured on the server. Please add it in Settings.",
        });
      }

      if (!userMembers || !Array.isArray(userMembers) || userMembers.length === 0) {
        return res.json({ matches: [], hasMatches: false, message: "No user family members provided for scanning." });
      }

      if (!publicMembers || !Array.isArray(publicMembers) || publicMembers.length === 0) {
        return res.json({ matches: [], hasMatches: false, message: "No public records available in other trees to compare against." });
      }

      // Prepare a compact and scannable summary of user and public members to avoid token bloating
      const userSummary = userMembers.map(m => ({
        id: m.id,
        name: m.name,
        birthdate: m.birthdate || "Unknown",
        birthplace: m.birthplace || "Unknown",
        gender: m.gender || "Unknown",
        relationship: m.relationshipToRoot || "Relative",
        notes: m.notes || "",
        isAncestor: m.isAncestor || false
      }));

      const publicSummary = publicMembers.map(m => ({
        id: m.id,
        userId: m.userId,
        name: m.name,
        birthdate: m.birthdate || "Unknown",
        birthplace: m.birthplace || "Unknown",
        gender: m.gender || "Unknown",
        notes: m.notes || "",
        isAncestor: m.isAncestor || false
      }));

      const prompt = `You are an expert genealogical matching engine and historical archivist.
Analyze the following two lists of family tree members to discover potential connections, distant relatives, or shared ancestors (highlighting potential DNA matches or ancestral network connections).

List 1: User's Family Tree (Your current user)
${JSON.stringify(userSummary, null, 2)}

List 2: Public Family Tree Database Records (From other users)
${JSON.stringify(publicSummary, null, 2)}

Compare records looking for:
1. Direct matching names (with minor spelling variations, e.g. "John Smith" vs "Jon Smith") born in a similar year (+/- 5 years) and similar birthplace.
2. Identifiable ancestral links (e.g. the user's great-grandfather seems to be the same person as another user's grandfather or grand-uncle).
3. Distant cousins or unknown relatives where multiple details align.

Formulate your response strictly as a JSON object with the following schema:
{
  "hasMatches": boolean,
  "matches": [
    {
      "userMemberId": "string",
      "matchedMemberId": "string",
      "matchedUserId": "string",
      "relationshipType": "string (e.g., 'Great-Grandfather match', 'Distant 3rd Cousin', 'Grand-Uncle match')",
      "confidence": number (integer between 0 and 100),
      "explanation": "string explaining the connection clearly and detail the match metrics",
      "connectionPath": "string tracing how they are connected"
    }
  ],
  "summary": "string summarizing the scanning results and general insights"
}

Provide ONLY the valid JSON, no markdown blocks or surrounding text. It must be directly parseable.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      const result = JSON.parse(responseText.trim());

      res.json(result);
    } catch (error: any) {
      console.error("Error matching ancestors with Gemini API:", error);
      res.status(500).json({ error: error.message || "Failed to process ancestral matching request." });
    }
  });

  // Vite or Static file serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
