# 🤖 GitHub PR Assistant

An Express.js API that acts as an intelligent GitHub Pull Request bot. When a PR is **opened**, **reopened**, or **updated**, it automatically:

- 📋 **Summarizes** what the PR does in plain English
- 🚨 **Flags production risks** (auth issues, DB migrations, security vulnerabilities, etc.)
- 📝 **Highlights commits** with context
- ⚡ **Detects breaking changes** in API contracts, schemas, and configs
- 🧪 **Notes missing tests** or test coverage concerns
- 🏆 **Scores code quality** and calls out strengths & concerns
- 🏷️ **Applies labels** like `risk:high`, `needs-tests`, `breaking-change`
- ♻️ **Updates** the comment on every push (no duplicate spam)
- 🤖 **Bot Badge** visual indicator for clear identification

Powered by **OpenRouter AI** (default: `qwen/qwen-turbo`) via the **OpenAI SDK**. Designed for **Vercel Serverless** deployment.

---

## 📐 Architecture

```
GitHub Webhook (pull_request event)
        │
        ▼
 Express.js API (/api/webhook/github)
        │
        ├── Verify HMAC-SHA256 signature
        │
        ├── Fetch PR files + diffs  (GitHub API via @octokit/rest)
        ├── Fetch PR commits        (GitHub API via @octokit/rest)
        │
        ├── Build AI prompt
        ├── Call OpenRouter AI      (OpenAI SDK → openrouter.ai)
        │
        ├── Parse JSON response
        ├── Format Markdown comment
        │
        ├── Post/Update PR comment  (GitHub API)
        └── Apply labels            (GitHub API)
```

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd github-pr-assistant
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx        # GitHub PAT (repo + pull_request scopes)
GITHUB_WEBHOOK_SECRET=your_secret_here       # Must match GitHub webhook settings
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxx  # Free key from openrouter.ai
OPENROUTER_MODEL=qwen/qwen-turbo             # Recommended model
PORT=3000
```

### 3. Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production / Test Local Webhook
node src/test-webhook.js
```

---

## 🌐 Deployment (Vercel)

This project is configured for **Vercel Serverless Functions**.

1. **Install Vercel CLI**: `npm i -g vercel`
2. **Deploy**:
   ```bash
   vercel
   ```
3. **Set Environment Variables** in Vercel Dashboard:
   - `GITHUB_TOKEN`
   - `GITHUB_WEBHOOK_SECRET`
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_MODEL` (Optional, defaults to `qwen/qwen-turbo`)

### Register the GitHub Webhook

1. Go to your GitHub repo → **Settings** → **Webhooks** → **Add webhook**
2. **Payload URL:** `https://<your-vercel-app>.vercel.app/api/webhook/github`
3. **Content type:** `application/json`
4. **Secret:** Same value as `GITHUB_WEBHOOK_SECRET`
5. **Events:** Select **Pull requests** only
6. Click **Add webhook**

---

## 🧪 Testing Locally

### Option A: Send a fake webhook (server must be running)

```bash
# Terminal 1
npm run dev

# Terminal 2
npm test
```

### Option B: Standalone (no server needed)

```bash
node src/test-webhook.js --standalone
```

---

## 📁 Project Structure

```
github-pr-assistant/
├── api/
│   └── index.js                        # Vercel Serverless Entry Point
├── src/
│   ├── index.js                        # Local Server Entry Point
│   ├── app.js                          # Express App & Middleware
│   ├── test-webhook.js                 # Local Testing Script
│   │
│   ├── routes/
│   │   ├── webhook.routes.js           # POST /api/webhook/github
│   │   └── health.routes.js            # GET  /api/health
│   │
│   ├── services/
│   │   ├── pr.service.js               # Main Analysis Orchestrator
│   │   ├── github.service.js           # GitHub API Interactions
│   │   └── ai.service.js               # OpenRouter AI Integration
│   │
│   └── utils/
│       └── prompt.utils.js             # Prompt Engineering & Markdown Formatting
│
├── vercel.json                         # Vercel Configuration
├── .env.example                        # Environment Template
├── package.json
└── README.md
```

---

## 🔑 Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | HTTP server port (Local) |
| `NODE_ENV` | No | `development` | Environment mode |
| `GITHUB_TOKEN` | **Yes** | – | GitHub PAT (needs `repo` or `pull_requests:write`) |
| `GITHUB_WEBHOOK_SECRET` | **Yes** | – | Webhook HMAC secret |
| `OPENROUTER_API_KEY` | **Yes** | – | OpenRouter API key |
| `OPENROUTER_MODEL` | No | `qwen/qwen-turbo` | AI model to use |
| `OPENROUTER_APP_NAME` | No | `GitHub PR Assistant` | App name shown in OpenRouter |
| `MAX_FILES_TO_ANALYZE` | No | `15` | Max files to include in AI analysis |
| `MAX_DIFF_CHARS_PER_FILE` | No | `3000` | Max diff chars per file (token control) |

---

## 🤖 Recommended AI Models (OpenRouter)

| Model | Quality | Context | Cost |
|---|---|---|---|
| `qwen/qwen-turbo` | ⭐⭐⭐⭐⭐ | 32K | Very Cheap |
| `qwen/qwen-2.5-7b-instruct:free` | ⭐⭐⭐⭐ | 32K | Free |
| `anthropic/claude-3-haiku` | ⭐⭐⭐⭐⭐ | 200K | Cheap, Fast |
| `deepseek/deepseek-chat` | ⭐⭐⭐⭐⭐ | 64K | Affordable |

Change the model anytime by updating `OPENROUTER_MODEL`.

---

## 🔒 Security

- All webhook payloads are verified with **HMAC-SHA256** using your `GITHUB_WEBHOOK_SECRET`.
- On Vercel, the function awaits AI completion to ensure the comment is posted before the instance freezes.
- No PR content is permanently stored.

---
