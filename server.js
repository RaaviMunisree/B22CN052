import express from "express";
import cors from "cors";
import logger from "./logger.js";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// In-memory database
const urlDatabase = new Map();

// Function to generate a random shortcode
function generateShortcode(length = 6) {
  return Math.random().toString(36).substring(2, 2 + length);
}

// POST API → Create Short URL
app.post("/shorturls", (req, res) => {
  try {
    const { url, validity, shortcode } = req.body;

    if (!url) {
      logger("backend", "error", "handler", "URL is required");
      return res.status(400).json({ error: "URL is required" });
    }

    // Use provided shortcode or generate one
    let shortCode = shortcode || generateShortcode();

    // Ensure shortcode is unique
    while (urlDatabase.has(shortCode)) {
      shortCode = generateShortcode();
    }

    const expiryTime = new Date(Date.now() + (validity || 30) * 60000).toISOString();

    // Save in DB
    urlDatabase.set(shortCode, {
      originalUrl: url,
      createdAt: new Date().toISOString(),
      expiry: expiryTime,
      clicks: [],
    });

    logger("backend", "info", "handler", `Short URL created for ${shortCode}`);

    return res.status(201).json({
      shortLink: `http://localhost:${PORT}/${shortCode}`,
      expiry: expiryTime,
    });
  } catch (error) {
    logger("backend", "error", "handler", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET API → Redirect to original URL
app.get("/:shortcode", (req, res) => {
  try {
    const { shortcode } = req.params;
    const linkData = urlDatabase.get(shortcode);

    if (!linkData) {
      logger("backend", "error", "handler", `Shortcode ${shortcode} not found`);
      return res.status(404).json({ error: "Shortcode not found" });
    }

    const now = new Date();
    if (now > new Date(linkData.expiry)) {
      logger("backend", "error", "handler", `Shortcode ${shortcode} expired`);
      return res.status(410).json({ error: "Link has expired" });
    }

    // Record click (timestamp, referrer, location placeholder)
    linkData.clicks.push({
      timestamp: now.toISOString(),
      referrer: req.get("Referrer") || "direct",
      location: "Unknown",
    });

    // Redirect to original URL
    return res.redirect(linkData.originalUrl);
  } catch (error) {
    logger("backend", "error", "handler", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET API → Short URL Statistics
app.get("/shorturls/:shortcode", (req, res) => {
  try {
    const { shortcode } = req.params;
    const linkData = urlDatabase.get(shortcode);

    if (!linkData) {
      logger("backend", "error", "handler", `Shortcode ${shortcode} not found`);
      return res.status(404).json({ error: "Shortcode not found" });
    }

    return res.status(200).json({
      originalUrl: linkData.originalUrl,
      createdAt: linkData.createdAt,
      expiry: linkData.expiry,
      totalClicks: linkData.clicks.length,
      clicks: linkData.clicks,
    });
  } catch (error) {
    logger("backend", "error", "handler", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start server
app.listen(PORT, () => {
  logger("backend", "info", "server", `Server running on http://localhost:${PORT}`);
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
