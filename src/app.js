const express = require("express");
const webhookRoutes = require("./routes/webhook.routes");
const healthRoutes = require("./routes/health.routes");
const { requestLogger } = require("./middleware/logger.middleware");
const { errorHandler } = require("./middleware/error.middleware");

const app = express();

app.use(
  "/api/webhook/github",
  express.raw({ type: "application/json" })
);


app.use(express.json());
app.use(requestLogger);

app.use("/api/health", healthRoutes);
app.use("/api/webhook", webhookRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

app.use(errorHandler);

module.exports = app;
