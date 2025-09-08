const express = require("express");
const urlStore = require("../data/urlStore");
const router = express.Router();


function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}


function isValidShortcode(shortcode) {
  return /^[A-Za-z0-9_-]{3,30}$/.test(shortcode);
}


router.post("/shorturls", (req, res) => {
  const { url, validity = 30, shortcode } = req.body;

  if (!url || !isValidUrl(url)) {
    const log = req.logger.error("Invalid URL format", { url });
    return res.status(400).json({ error: "Invalid URL format", ...log });
  }

  if (!shortcode) {
    const log = req.logger.error("Shortcode missing");
    return res.status(400).json({ error: "Shortcode is required", ...log });
  }

  if (!isValidShortcode(shortcode)) {
    const log = req.logger.error("Invalid shortcode format", { shortcode });
    return res.status(400).json({
      error:
        "Shortcode must be alphanumeric, may include '-' or '_', and be 3-30 characters long",
      ...log,
    });
  }

  if (urlStore.has(shortcode)) {
    const log = req.logger.error("Shortcode already exists", { shortcode });
    return res.status(409).json({ error: "Shortcode already in use", ...log });
  }

  const now = new Date();
  const expiry = new Date(now.getTime() + validity * 60000);

  urlStore.set(shortcode, {
    originalUrl: url,
    createdAt: now,
    expiry,
    clicks: [],
  });

  const shortLink = `${req.protocol}://${req.get("host")}/${shortcode}`;

  const log = req.logger.info("Short URL created successfully", { shortLink });
  return res.status(201).json({
    shortLink,
    expiry: expiry.toISOString(),
    ...log,
  });
});


router.get("/shorturls/:shortcode", (req, res) => {
  const { shortcode } = req.params;

  if (!urlStore.has(shortcode)) {
    const log = req.logger.error("Shortcode not found", { shortcode });
    return res.status(404).json({ error: "Shortcode not found", ...log });
  }

  const urlData = urlStore.get(shortcode);
  const now = new Date();

  if (now > urlData.expiry) {
    const log = req.logger.error("Shortcode expired", { shortcode });
    return res.status(410).json({ error: "Link has expired", ...log });
  }

  const stats = {
    originalUrl: urlData.originalUrl,
    createdAt: urlData.createdAt,
    expiry: urlData.expiry,
    totalClicks: urlData.clicks.length,
    clickDetails: urlData.clicks,
  };

  const log = req.logger.info("Short URL statistics retrieved successfully", { shortcode });
  return res.status(200).json({ ...stats, ...log });
});

router.get("/:shortcode", (req, res) => {
  const { shortcode } = req.params;

  if (!urlStore.has(shortcode)) {
    const log = req.logger.error("Shortcode not found for redirection", { shortcode });
    return res.status(404).json({ error: "Shortcode not found", ...log });
  }

  const urlData = urlStore.get(shortcode);
  const now = new Date();

  if (now > urlData.expiry) {
    const log = req.logger.error("Shortcode expired, cannot redirect", { shortcode });
    return res.status(410).json({ error: "Link has expired", ...log });
  }


  const clickInfo = {
    timestamp: now,
    referrer: req.get("Referrer") || "Direct",
    ip: req.ip,
  };
  urlData.clicks.push(clickInfo);

  req.logger.info("Redirecting to original URL", {
    shortcode,
    originalUrl: urlData.originalUrl,
  });

  return res.redirect(urlData.originalUrl);
});

module.exports = router;
