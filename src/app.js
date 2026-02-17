const express = require("express");
const webhookRoutes = require("./routes/webhook.routes");
const healthRoutes = require("./routes/health.routes");
const { requestLogger } = require("./middleware/logger.middleware");
const { errorHandler } = require("./middleware/error.middleware");

const app = express();

// Parse raw body for GitHub webhook (must be before express.json)
app.use(
  "/api/webhook/github",
  express.raw({ type: "application/json", limit: "10mb" })
);

app.use(express.json());
app.use(requestLogger);

// Mount routes
app.use("/api/health", healthRoutes);
app.use("/api/webhook", webhookRoutes);

app.get("/", (req, res) => {
  res.send("GitHub PR Assistant is running! 🚀<br>Check <a href='/api/health'>/api/health</a> for status.");
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

app.use(errorHandler);

module.exports = app;
