import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// System prompt — edit this to shape how the AI behaves
const SYSTEM_PROMPT = `You are an expert AI study planner and academic tutor. 
Your role is to help students with:
- Creating structured study guides and outlines
- Building personalized study schedules and plans
- Explaining complex concepts clearly and at the right level
- Suggesting effective study strategies and techniques

Keep responses focused, well-structured, and encouraging. 
Use markdown formatting (headers, bullet points, bold) where it helps readability.
If a request is outside academic study planning, gently redirect back to your purpose.`;

// Chat history stored per session (in-memory, resets on server restart)
const sessions = {};

app.post("/api/chat", async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || !sessionId) {
    return res.status(400).json({ error: "message and sessionId are required" });
  }

  // Initialize session history if new
  if (!sessions[sessionId]) {
    sessions[sessionId] = [];
  }

  // Append user message to history
  sessions[sessionId].push({ role: "user", content: message });

  try {
    // Set up streaming response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...sessions[sessionId],
      ],
      stream: true,
      max_tokens: 1500,
    });

    let fullResponse = "";

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }

    // Save assistant reply to session history
    sessions[sessionId].push({ role: "assistant", content: fullResponse });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("OpenAI error:", err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// Clear session history
app.delete("/api/session/:sessionId", (req, res) => {
  delete sessions[req.params.sessionId];
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`✅ Study Planner API running at http://localhost:${PORT}`);
});
