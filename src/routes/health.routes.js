const express = require("express");
const router = express.Router();

/**
 * GET /api/health
 * Simple health check endpoint for uptime monitoring.
 */
router.get("/", (req, res) => {
  res.json({
    success: true,
    service: "GitHub PR Assistant",
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    config: {
      model: process.env.OPENROUTER_MODEL || "qwen/qwen-turbo",
      maxFilesToAnalyze: parseInt(process.env.MAX_FILES_TO_ANALYZE || "15"),
      githubTokenSet: !!process.env.GITHUB_TOKEN,
      openRouterKeySet: !!process.env.OPENROUTER_API_KEY,
      webhookSecretSet: !!process.env.GITHUB_WEBHOOK_SECRET,
    },
  });
});

module.exports = router;
