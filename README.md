# 🤖 GitHub PR Assistant

An Express.js API that acts as an intelligent GitHub Pull Request bot. When a PR is **opened**, **reopened**, or **updated**, it automatically:

- 📋 **Summarizes** what the PR does in plain English
- 🚨 **Flags production risks** (auth issues, DB migrations, N+1 queries, race conditions, etc.)
- 📝 **Highlights commits** with context
- ⚡ **Detects breaking changes** in API contracts, schemas, and configs
- 🧪 **Notes missing tests** or test coverage concerns
- 🏆 **Scores code quality** and calls out strengths & concerns
- 🏷️ **Applies labels** like `risk:high`, `needs-tests`, `breaking-change`
- ♻️ **Updates** the comment on every push (no duplicate spam)

Powered by **OpenRouter AI** (free `deepseek/deepseek-chat-v3-0324` model) via the **OpenAI SDK**.

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
OPENROUTER_MODEL=deepseek/deepseek-chat-v3-0324:free
PORT=3000
```

### 3. Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 4. Expose to the Internet (for GitHub webhooks)

Use [ngrok](https://ngrok.com) for local development:

```bash
ngrok http 3000
# Copy the https:// URL
```

### 5. Register the GitHub Webhook

1. Go to your GitHub repo → **Settings** → **Webhooks** → **Add webhook**
2. **Payload URL:** `https://your-ngrok-url.ngrok.io/api/webhook/github`
3. **Content type:** `application/json`
4. **Secret:** Same value as `GITHUB_WEBHOOK_SECRET` in your `.env`
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
├── src/
│   ├── index.js                        # Entry point
│   ├── app.js                          # Express app setup
│   ├── test-webhook.js                 # Local testing script
│   │
│   ├── routes/
│   │   ├── webhook.routes.js           # POST /api/webhook/github
│   │   └── health.routes.js            # GET  /api/health
│   │
│   ├── middleware/
│   │   ├── signature.middleware.js     # GitHub HMAC-SHA256 verification
│   │   ├── logger.middleware.js        # Request logger
│   │   └── error.middleware.js         # Global error handler
│   │
│   ├── services/
│   │   ├── pr.service.js               # Main PR analysis orchestrator
│   │   ├── github.service.js           # GitHub API calls (Octokit)
│   │   └── ai.service.js               # OpenRouter AI calls (OpenAI SDK)
│   │
│   └── utils/
│       └── prompt.utils.js             # Prompt builder + comment formatter
│
├── .env.example                        # Environment variable template
├── package.json
└── README.md
```

---

## 🔑 Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | HTTP server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `GITHUB_TOKEN` | **Yes** | – | GitHub Personal Access Token |
| `GITHUB_WEBHOOK_SECRET` | **Yes** | – | Webhook HMAC secret |
| `OPENROUTER_API_KEY` | **Yes** | – | OpenRouter API key |
| `OPENROUTER_MODEL` | No | `deepseek/deepseek-chat-v3-0324:free` | AI model to use |
| `OPENROUTER_APP_NAME` | No | `GitHub PR Assistant` | App name shown in OpenRouter dashboard |
| `MAX_FILES_TO_ANALYZE` | No | `15` | Max files to include in AI analysis |
| `MAX_DIFF_CHARS_PER_FILE` | No | `3000` | Max diff chars per file (token control) |

---

## 🤖 AI Models (Free on OpenRouter)

| Model | Quality | Context | Best For |
|---|---|---|---|
| `deepseek/deepseek-chat-v3-0324:free` | ⭐⭐⭐⭐⭐ | 64K | **Recommended** – best free model |
| `meta-llama/llama-4-maverick:free` | ⭐⭐⭐⭐ | 128K | Large PRs with many files |
| `google/gemma-3-27b-it:free` | ⭐⭐⭐ | 8K | Lightweight, fast |
| `mistralai/mistral-7b-instruct:free` | ⭐⭐ | 32K | Fastest response |

Change the model anytime by updating `OPENROUTER_MODEL` in `.env`.

---

## 📊 Sample PR Comment Output

The bot posts a comment like this on every PR:

```markdown
## 🤖 PR Assistant Analysis

> **Overall Risk Level:** 🟠 `HIGH` | **Code Quality:** 7/10 | **Type:** feature
> *Analyzed at 2025-01-15T10:30:00.000Z*

### 📋 Summary
This PR adds JWT authentication middleware to protect all /api/users endpoints.
It introduces a new auth module, updates route definitions, and removes a legacy
session-based approach.

### 🚨 Production Risk Assessment
| Severity | Area | Issue | Recommendation |
|---|---|---|---|
| 🟠 HIGH | Auth | JWT secret hardcoded in config.js | Move to environment variable immediately |
| 🟡 MEDIUM | API | Existing sessions invalidated on deploy | Plan a migration window or dual-support period |

### ⚡ Breaking Changes
> ⚠️ Session-based auth removed – all clients must send Authorization: Bearer header

...
```

---

## 🔒 Security

- All webhook payloads are verified with **HMAC-SHA256** using your `GITHUB_WEBHOOK_SECRET`
- GitHub responds in < 1 second (202 Accepted); AI analysis runs asynchronously
- No PR content is stored – only sent transiently to OpenRouter's API
- Set `GITHUB_TOKEN` scopes to minimum required: `repo` (read) + `pull_requests` (write)

---

## 📜 License

MIT
