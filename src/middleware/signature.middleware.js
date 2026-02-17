const crypto = require("crypto");


function verifyGitHubSignature(req, res, next) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return res.status(500).json({
        success: false,
        message: "GITHUB_WEBHOOK_SECRET is not configured",
      });
    }
    console.warn("⚠️  GITHUB_WEBHOOK_SECRET not set – skipping signature check (dev mode)");
    return next();
  }

  const signature = req.headers["x-hub-signature-256"];

  if (!signature) {
    return res.status(401).json({
      success: false,
      message: "Missing X-Hub-Signature-256 header",
    });
  }

  
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(req.body);
  const expected = `sha256=${hmac.digest("hex")}`;

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    console.warn("🚫 Invalid webhook signature");
    return res.status(401).json({
      success: false,
      message: "Invalid webhook signature",
    });
  }

  next();
}

module.exports = { verifyGitHubSignature };
