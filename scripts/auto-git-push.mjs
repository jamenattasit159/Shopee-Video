import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const projectDir = path.resolve("c:/Users/DOL/Documents/antigravity/lucid-noether");
const logFile = path.join(projectDir, "data", "auto_push.log");

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(line.trim());
  try {
    fs.appendFileSync(logFile, line, "utf8");
  } catch {}
}

function run(cmd) {
  try {
    return execSync(cmd, { cwd: projectDir, encoding: "utf8" }).trim();
  } catch (err) {
    return null;
  }
}

async function main() {
  log("=== Starting Daily Git Check ===");

  const currentBranch = run("git branch --show-current") || "feat/audio-first-diverse-motion";
  log(`Current branch: ${currentBranch}`);

  // Fetch remote status silently
  run("git fetch origin");

  // Check status
  const status = run("git status --porcelain");
  const hasUncommitted = !!status && status.length > 0;

  if (hasUncommitted) {
    log("Found uncommitted changes. Staging and committing...");
    run("git add -A");
    const commitMsg = `chore(auto): daily automated sync at ${new Date().toLocaleTimeString("th-TH")}`;
    run(`git commit -m "${commitMsg}"`);

    // Get latest commit hash
    const latestHash = run("git log -n 1 --format=\"%H (%h)\"");
    log(`Committed: ${latestHash}`);

    // Update COMMIT_LOG.txt if needed
    try {
      const commitLogPath = path.join(projectDir, "COMMIT_LOG.txt");
      if (fs.existsSync(commitLogPath)) {
        const content = fs.readFileSync(commitLogPath, "utf8");
        const entry = `\n--------------------------------------------------------------------------------\n\n[AUTO-COMMIT]\nCommit Hash: ${latestHash}\nDate/Time:   ${new Date().toLocaleString("th-TH")}\nSubject:     ${commitMsg}\nรายละเอียด: บันทึกการเปลี่ยนแปลงอัตโนมัติประจำวัน (Daily Git Auto-Sync)\n`;
        // Insert near top after header
        const headerEnd = content.indexOf("================================================================================", 80);
        if (headerEnd !== -1) {
          const insertPos = headerEnd + 80;
          const newContent = content.slice(0, insertPos) + entry + content.slice(insertPos);
          fs.writeFileSync(commitLogPath, newContent, "utf8");
          run("git add COMMIT_LOG.txt");
          run("git commit --amend --no-edit");
        }
      }
    } catch (e) {
      log(`Error updating COMMIT_LOG.txt: ${e.message}`);
    }
  } else {
    log("Working tree clean.");
  }

  // Check if ahead of remote
  const aheadCheck = run(`git log origin/${currentBranch}..HEAD --oneline`);
  if (aheadCheck && aheadCheck.trim().length > 0) {
    log(`Found unpushed commits:\n${aheadCheck}`);
    log("Pushing to origin...");
    const pushResult = run(`git push origin ${currentBranch}`);
    log(`Push result: ${pushResult || "OK"}`);
  } else {
    log("Remote is up to date. Nothing to push.");
  }

  log("=== Daily Git Check Completed ===");
}

main();
