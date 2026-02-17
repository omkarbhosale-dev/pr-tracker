const { Octokit } = require("@octokit/rest");


let _octokit = null;

function getOctokit() {
  if (!_octokit) {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error("GITHUB_TOKEN environment variable is not set");
    }
    _octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  }
  return _octokit;
}


async function getPullRequestFiles(owner, repo, pullNumber) {
  const octokit = getOctokit();
  const maxFiles = parseInt(process.env.MAX_FILES_TO_ANALYZE || "15");
  const maxDiffChars = parseInt(process.env.MAX_DIFF_CHARS_PER_FILE || "3000");

  const { data: files } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });

  return files.slice(0, maxFiles).map((f) => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    changes: f.changes,
    patch: f.patch ? f.patch.slice(0, maxDiffChars) : "(binary or no diff available)",
  }));
}


async function getPullRequestCommits(owner, repo, pullNumber) {
  const octokit = getOctokit();

  const { data: commits } = await octokit.pulls.listCommits({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });

  return commits.map((c) => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message,
    author: c.commit.author?.name || "Unknown",
    date: c.commit.author?.date,
  }));
}


async function upsertPRComment(owner, repo, pullNumber, body) {
  const octokit = getOctokit();
  const BOT_HEADER = "<!-- github-pr-assistant -->";

 
  const { data: existingComments } = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: pullNumber,
    per_page: 100,
  });

  const existingComment = existingComments.find((c) =>
    c.body?.includes(BOT_HEADER)
  );

  const fullBody = `${BOT_HEADER}\n${body}`;

  if (existingComment) {
    await octokit.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body: fullBody,
    });
    console.log(`✏️  Updated existing bot comment #${existingComment.id}`);
  } else {
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body: fullBody,
    });
    console.log("💬 Created new bot comment on PR");
  }
}


async function applyLabels(owner, repo, pullNumber, labels) {
  if (!labels || labels.length === 0) return;
  const octokit = getOctokit();

  try {
    await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: pullNumber,
      labels,
    });
    console.log(`🏷️  Applied labels: ${labels.join(", ")}`);
  } catch (err) {
    console.warn("⚠️  Could not apply labels (they may not exist in the repo):", err.message);
  }
}

module.exports = {
  getPullRequestFiles,
  getPullRequestCommits,
  upsertPRComment,
  applyLabels,
};
