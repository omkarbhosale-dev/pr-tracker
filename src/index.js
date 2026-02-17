require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║         🤖  GitHub PR Assistant  –  RUNNING          ║
╠══════════════════════════════════════════════════════╣
║  Server  : http://localhost:${PORT}                     ║
║  Webhook : http://localhost:${PORT}/api/webhook/github  ║
║  Health  : http://localhost:${PORT}/api/health          ║
╚══════════════════════════════════════════════════════╝
  `);
});
