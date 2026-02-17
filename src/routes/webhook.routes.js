const express = require("express");
const router = express.Router();
const { verifyGitHubSignature } = require("../middleware/signature.middleware");
const { handlePullRequestEvent } = require("../services/pr.service");

/**
 * POST /api/webhook/github
 * Receives all GitHub webhook events.
 * GitHub must be configured with Content-Type: application/json
 */
router.post("/github", verifyGitHubSignature, async (req, res) => {
  // Parse body (raw buffer was needed for signature check)
  const payload = JSON.parse(req.body.toString("utf8"));
  const event = req.headers["x-github-event"];
  const delivery = req.headers["x-github-delivery"];

  console.log(`\n📦 Received GitHub event: [${event}] delivery=${delivery}`);

  // ── Respond immediately so GitHub doesn't timeout ────────────────────────
  res.status(202).json({ success: true, message: "Webhook received", event, delivery });

  // ── Process asynchronously ───────────────────────────────────────────────
  try {
    if (event === "pull_request") {
      const { action } = payload;

      // Trigger assistant on PR open or re-open
      if (action === "opened" || action === "reopened" || action === "synchronize") {
        console.log(`🔄 PR action="${action}" – starting AI analysis...`);
        await handlePullRequestEvent(payload);
      } else {
        console.log(`⏭️  PR action="${action}" – skipped (not relevant)`);
      }
    } else {
      console.log(`⏭️  Event "${event}" – no handler registered`);
    }
  } catch (err) {
    console.error("❌ Error processing webhook:", err.message);
  }
});

module.exports = router;
