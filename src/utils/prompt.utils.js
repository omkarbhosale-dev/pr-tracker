
function buildSystemPrompt() {
  return `You are an expert senior software engineer and code review assistant embedded as a GitHub bot.
Your job is to analyze a Pull Request and produce a structured, insightful report in Markdown.

You MUST respond with ONLY a single JSON object (no prose before or after it) wrapped in a \`\`\`json block.

The JSON must have exactly this shape:
\`\`\`json
{
  "summary": "string – 2-4 sentence high-level summary of what this PR does",
  "purpose": "string – the WHY behind this PR (feature / bugfix / refactor / docs / chore / perf)",
  "keyChanges": ["string", "string"],
  "commitHighlights": ["string"],
  "productionRisks": [
    {
      "severity": "critical | high | medium | low",
      "area": "string – e.g. 'Database', 'Auth', 'API'",
      "description": "string",
      "recommendation": "string"
    }
  ],
  "codeQuality": {
    "score": "number 1-10",
    "strengths": ["string"],
    "concerns": ["string"]
  },
  "testingNotes": "string – observations about test coverage or missing tests",
  "breakingChanges": ["string"],
  "suggestedReviewers": ["string – describe the type of reviewer needed, not names"],
  "overallRiskLevel": "critical | high | medium | low",
  "labels": ["string – concise GitHub label names like 'risk:high', 'needs-tests', 'breaking-change'"]
}
\`\`\`

Guidelines:
- Be specific, not generic. Reference actual file names and code patterns from the diff.
- For production risks, think about: DB migrations, auth bypasses, N+1 queries, race conditions, secret exposure, breaking API contracts, missing error handling.
- Breaking changes = anything that breaks existing API contracts, DB schema, or configuration.
- Keep each string under 200 characters.
- If a section has nothing to report, use an empty array [] or "None identified.".`;
}


function buildUserPrompt({ pr, files, commits }) {
  const filesSummary = files
    .map(
      (f, i) =>
        `### File ${i + 1}: \`${f.filename}\` [${f.status}] (+${f.additions}/-${f.deletions})\n` +
        "```diff\n" +
        f.patch +
        "\n```"
    )
    .join("\n\n");

  const commitsList = commits
    .map((c) => `- \`${c.sha}\` **${c.author}** (${c.date?.slice(0, 10)}): ${c.message.split("\n")[0]}`)
    .join("\n");

  return `## Pull Request Details

**Title:** ${pr.title}
**Author:** ${pr.user?.login}
**Base branch:** \`${pr.base?.ref}\` ← **Head branch:** \`${pr.head?.ref}\`
**Repository:** ${pr.base?.repo?.full_name}
**Description:**
${pr.body || "_No description provided_"}

**Stats:** ${pr.additions} additions, ${pr.deletions} deletions, ${pr.changed_files} files changed

---

## Commits (${commits.length})
${commitsList || "_No commits found_"}

---

## Changed Files & Diffs (${files.length} shown)
${filesSummary || "_No diff available_"}

---

Now analyze this PR and return the JSON report as instructed.`;
}


function formatCommentMarkdown(analysis, pr) {
  const riskEmoji = {
    critical: "🔴",
    high: "🟠",
    medium: "🟡",
    low: "🟢",
  };

  const severityEmoji = riskEmoji[analysis.overallRiskLevel] || "⚪";


  const risksTable =
    analysis.productionRisks?.length > 0
      ? `| Severity | Area | Issue | Recommendation |\n|---|---|---|---|\n` +
        analysis.productionRisks
          .map(
            (r) =>
              `| ${riskEmoji[r.severity] || "⚪"} **${r.severity.toUpperCase()}** | ${r.area} | ${r.description} | ${r.recommendation} |`
          )
          .join("\n")
      : "_No production risks identified_ ✅";


  const keyChangesList =
    analysis.keyChanges?.map((c) => `- ${c}`).join("\n") || "_None_";


  const commitHighlightsList =
    analysis.commitHighlights?.map((c) => `- ${c}`).join("\n") || "_None_";


  const breakingList =
    analysis.breakingChanges?.length > 0
      ? analysis.breakingChanges.map((b) => `> ⚠️ ${b}`).join("\n")
      : "_None detected_";

  const cq = analysis.codeQuality || {};
  const qualityScore = cq.score ? `**${cq.score}/10**` : "N/A";
  const strengthsList = cq.strengths?.map((s) => `- ✅ ${s}`).join("\n") || "_None_";
  const concernsList = cq.concerns?.map((c) => `- ⚠️ ${c}`).join("\n") || "_None_";


  const reviewersList =
    analysis.suggestedReviewers?.map((r) => `- 👤 ${r}`).join("\n") || "_None_";

  const timestamp = new Date().toISOString();

  return `## 🤖 PR Assistant Analysis

> **Overall Risk Level:** ${severityEmoji} \`${(analysis.overallRiskLevel || "unknown").toUpperCase()}\` &nbsp;|&nbsp; **Code Quality:** ${qualityScore} &nbsp;|&nbsp; **Type:** ${analysis.purpose || "Unknown"}
> *Analyzed at ${timestamp}*

---

### 📋 Summary
${analysis.summary || "_No summary generated_"}

---

### 🔑 Key Changes
${keyChangesList}

---

### 📝 Commit Highlights
${commitHighlightsList}

---

### 🚨 Production Risk Assessment
${risksTable}

---

### ⚡ Breaking Changes
${breakingList}

---

### 🧪 Testing Notes
${analysis.testingNotes || "_No testing observations_"}

---

### 🏆 Code Quality
**Score:** ${qualityScore}

**Strengths:**
${strengthsList}

**Concerns:**
${concernsList}

---

### 👥 Suggested Reviewers
${reviewersList}

---

<details>
<summary>🏷️ Suggested Labels</summary>

${analysis.labels?.map((l) => `\`${l}\``).join(" ") || "_None_"}
</details>

---
<sub>🤖 Generated by [GitHub PR Assistant](https://github.com) using OpenRouter AI · Model: \`${process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324:free"}\`</sub>`;
}

module.exports = { buildSystemPrompt, buildUserPrompt, formatCommentMarkdown };
