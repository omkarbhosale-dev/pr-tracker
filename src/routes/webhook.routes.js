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
  // NOTE: On Vercel Serverless, we CANNOT respond early and process in background
  // because the function will freeze/terminate. We must await execution.
  // GitHub has a 10s timeout, hoping AI is fast enough or we accept strict timeouts.
  
  try {
     console.log(`\n📦 Received GitHub event: [${event}] delivery=${delivery}`);

    if (event === "pull_request") {
      const { action } = payload;
      // Trigger assistant on PR open or re-open
      if (action === "opened" || action === "reopened" || action === "synchronize") {
        console.log(`🔄 PR action="${action}" – starting AI analysis...`);
        // Await the handler on Serverless environment
        await handlePullRequestEvent(payload);
      } else {
        console.log(`⏭️  PR action="${action}" – skipped (not relevant)`);
      }
    } else {
      console.log(`⏭️  Event "${event}" – no handler registered`);
    }

    // Send response AFTER work is done
    res.status(200).json({ success: true, message: "Webhook processed" });
  } catch (err) {
    console.error("❌ Error processing webhook:", err);
    res.status(500).json({ success: false, message: "Internal Error" });
  }
});

module.exports = router;
