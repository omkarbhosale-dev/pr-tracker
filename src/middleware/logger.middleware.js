
function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, path, ip } = req;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const statusEmoji = res.statusCode < 300 ? "✅" : res.statusCode < 400 ? "🔀" : "❌";
    console.log(
      `${statusEmoji} [${new Date().toISOString()}] ${method} ${path} → ${res.statusCode} (${duration}ms) from ${ip}`
    );
  });

  next();
}

module.exports = { requestLogger };
