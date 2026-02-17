/**
 * test-webhook.js
 *
 * Local test script that simulates a GitHub `pull_request` webhook payload
 * WITHOUT needing a real GitHub repo or a live ngrok tunnel.
 *
 * Usage:
 *   1. Start the server: npm run dev
 *   2. In another terminal: node src/test-webhook.js
 *
 * Or run standalone (without the server):
 *   node src/test-webhook.js --standalone
 */

require("dotenv").config();

const STANDALONE = process.argv.includes("--standalone");

// ── Minimal fake PR payload ────────────────────────────────────────────────
const FAKE_PAYLOAD = {
  action: "opened",
  number: 42,
  pull_request: {
    number: 42,
    title: "feat: add JWT authentication to /api/users endpoint",
    body: "This PR adds JWT-based auth middleware to protect the user management API.\n\nCloses #38",
    user: { login: "dev-alice" },
    base: { ref: "main", repo: { full_name: "myorg/myapp" } },
    head: { ref: "feature/jwt-auth" },
    additions: 180,
    deletions: 25,
    changed_files: 5,
  },
  repository: {
    name: "myapp",
    owner: { login: "myorg" },
  },
};

if (STANDALONE) {
  console.log("🧪 Running standalone test (no HTTP server needed)...\n");
  const { handlePullRequestEvent } = require("./services/pr.service");

  handlePullRequestEvent(FAKE_PAYLOAD)
    .then(() => console.log("\n✅ Standalone test finished"))
    .catch((err) => {
      console.error("❌ Standalone test failed:", err.message);
      process.exit(1);
    });
} else {
  const crypto = require("crypto");
  const http = require("http");

  const PORT = process.env.PORT || 3000;
  const SECRET = process.env.GITHUB_WEBHOOK_SECRET || "";
  const body = JSON.stringify(FAKE_PAYLOAD);

  const signature = SECRET
    ? `sha256=${crypto.createHmac("sha256", SECRET).update(body).digest("hex")}`
    : "sha256=test_no_secret";

  const options = {
    hostname: "localhost",
    port: PORT,
    path: "/api/webhook/github",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
      "X-GitHub-Event": "pull_request",
      "X-GitHub-Delivery": `test-${Date.now()}`,
      "X-Hub-Signature-256": signature,
    },
  };

  console.log(`🧪 Sending fake PR webhook to http://localhost:${PORT}/api/webhook/github\n`);

  const req = http.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      console.log(`Response status: ${res.statusCode}`);
      console.log("Response body:", data);
    });
  });

  req.on("error", (err) => {
    console.error("❌ Request failed:", err.message);
    console.log("Make sure the server is running: npm run dev");
  });

  req.write(body);
  req.end();
}
