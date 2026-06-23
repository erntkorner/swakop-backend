// server.js
// Minimal backend that proxies requests to the Anthropic API.
// Your API key stays here, on the server, and is never sent to the browser.

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json());

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY environment variable.");
  console.error("Set it before starting the server, e.g.:");
  console.error('  export ANTHROPIC_API_KEY="sk-ant-...');
  process.exit(1);
}

// POST /api/research
// Body: { agentName: string }
app.post("/api/research", async (req, res) => {
  const { agentName } = req.body;

  if (!agentName || typeof agentName !== "string") {
    return res.status(400).json({ error: "agentName is required" });
  }

  const prompt = `You are a real estate research assistant. Search for and summarize information about the estate agency "${agentName}" in Swakopmund, Namibia.

Please provide:
## Agency Overview
- A brief description of the agency

## Current Listings
- List any known property listings (for sale or rental) with rough prices in NAD if available
- Include property types, sizes, and areas/suburbs in Swakopmund

## Contact & Office Details
- Phone, email, website, physical address if found

## Sales & Rental Stats
- Typical price ranges for properties they deal with in Swakopmund
- Whether they focus on residential, commercial, or both

Keep it factual and concise. If exact data is not available, give general market context for Swakopmund.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return res.status(502).json({ error: "Upstream API error" });
    }

    const data = await response.json();
    const text = data.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    res.json({ result: text });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/discover
// Body: {} (no input needed)
app.post("/api/discover", async (req, res) => {
  const prompt = `Search for estate agents and real estate agencies in Swakopmund, Namibia. List all you can find with:
- Agency name
- Phone number
- Email address
- Website
Format each as: NAME | PHONE | EMAIL | WEBSITE`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return res.status(502).json({ error: "Upstream API error" });
    }

    const data = await response.json();
    const text = data.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    res.json({ result: text });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
