const { getPullRequestFiles, getPullRequestCommits, upsertPRComment, applyLabels } = require("./github.service");
const { callAI, parseJSONFromAI } = require("./ai.service");
const { buildSystemPrompt, buildUserPrompt, formatCommentMarkdown } = require("../utils/prompt.utils");


async function handlePullRequestEvent(payload) {
  const pr = payload.pull_request;
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const pullNumber = pr.number;

  console.log(`\n🔍 Analyzing PR #${pullNumber}: "${pr.title}" in ${owner}/${repo}`);
  console.log(`   Base: ${pr.base.ref} ← Head: ${pr.head.ref}`);
  console.log(`   Stats: +${pr.additions}/-${pr.deletions} across ${pr.changed_files} files`);

  // ── Step 1: Fetch PR data from GitHub ──────────────────────────────────
  console.log("\n📂 Fetching changed files...");
  const files = await getPullRequestFiles(owner, repo, pullNumber);
  console.log(`   Retrieved ${files.length} files`);

  console.log("📌 Fetching commits...");
  const commits = await getPullRequestCommits(owner, repo, pullNumber);
  console.log(`   Retrieved ${commits.length} commits`);

  // ── Step 2: Build AI prompt ─────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({ pr, files, commits });

  console.log("\n🤖 Sending to AI for analysis...");

  // ── Step 3: Call OpenRouter AI ──────────────────────────────────────────
  let rawAIResponse;
  try {
    rawAIResponse = await callAI(systemPrompt, userPrompt, {
      maxTokens: 2048,
      temperature: 0.2,
    });
  } catch (err) {
    console.error("❌ AI call failed:", err.message);
    await upsertPRComment(
      owner,
      repo,
      pullNumber,
      `## 🤖 PR Assistant Analysis\n\n> ⚠️ Analysis failed: ${err.message}\n\nPlease check the assistant logs.`
    );
    return;
  }

  // ── Step 4: Parse AI JSON response ─────────────────────────────────────
  console.log("\n📊 Parsing AI analysis...");
  const analysis = parseJSONFromAI(rawAIResponse);

  if (!analysis) {
    console.error("❌ Could not parse AI JSON response. Raw response:", rawAIResponse.slice(0, 500));
    await upsertPRComment(
      owner,
      repo,
      pullNumber,
      `## 🤖 PR Assistant Analysis\n\n> ⚠️ Could not parse AI response. Raw output:\n\n\`\`\`\n${rawAIResponse.slice(0, 1000)}\n\`\`\``
    );
    return;
  }

  console.log(`   Risk level: ${analysis.overallRiskLevel}`);
  console.log(`   Production risks: ${analysis.productionRisks?.length || 0}`);
  console.log(`   Breaking changes: ${analysis.breakingChanges?.length || 0}`);

  // ── Step 5: Format and post Markdown comment ────────────────────────────
  console.log("\n💬 Posting comment to GitHub...");
  const commentBody = formatCommentMarkdown(analysis, pr);
  await upsertPRComment(owner, repo, pullNumber, commentBody);

  // ── Step 6: Apply labels ────────────────────────────────────────────────
  if (analysis.labels?.length > 0) {
    await applyLabels(owner, repo, pullNumber, analysis.labels);
  }

  console.log(`\n🎉 PR #${pullNumber} analysis complete!\n`);
}

module.exports = { handlePullRequestEvent };
