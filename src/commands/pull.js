import { existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { contextDir as getContextDir } from "../core/context-root.js";
import { git, isGitRepo } from "../core/git.js";

/**
 * Pull .context/ from its remote repository.
 * 
 * agent-mem pull                     — pull from configured remote
 * agent-mem pull --remote <url>      — clone/pull from specific remote
 */
export default async function pull({ args, flags }) {
  const root = flags._contextRoot || process.cwd();
  const ctxDir = join(root, ".context");

  // Case 1: .context/ doesn't exist yet — clone from remote
  if (!existsSync(ctxDir)) {
    const remote = flags.remote || args[0];
    if (!remote) {
      console.error("❌ No .context/ found and no remote specified.");
      console.error("Usage: agent-mem pull --remote <git-url>");
      process.exit(1);
    }

    console.log(`  ⬇️  Cloning context from ${remote}...`);
    try {
      execSync(`git clone ${remote} .context`, {
        cwd: root,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      console.log(`\n✅ PULLED: ${remote} → .context/`);
      console.log("Run: agent-mem snapshot");
    } catch (err) {
      console.error(`❌ Clone failed: ${err.stderr?.trim() || err.message}`);
      process.exit(1);
    }
    return;
  }

  // Case 2: .context/ exists with a remote — pull updates
  if (!isGitRepo(ctxDir)) {
    console.error("❌ .context/ exists but is not a git repo.");
    process.exit(1);
  }

  // Set remote if provided
  if (flags.remote) {
    try {
      git("remote remove origin", ctxDir);
    } catch {}
    git(`remote add origin ${flags.remote}`, ctxDir);
  }

  let remoteUrl;
  try {
    remoteUrl = git("remote get-url origin", ctxDir);
  } catch {
    console.error("❌ No remote configured. Use: agent-mem pull --remote <git-url>");
    process.exit(1);
  }

  console.log(`  ⬇️  Pulling from ${remoteUrl}...`);
  try {
    git("pull --rebase origin main", ctxDir);
    console.log(`\n✅ PULLED: latest context from ${remoteUrl}`);
    console.log("Run: agent-mem snapshot");
  } catch (err) {
    // Try without rebase
    try {
      git("pull origin main --no-rebase", ctxDir);
      console.log(`\n✅ PULLED (merged): latest context from ${remoteUrl}`);
    } catch (err2) {
      console.error(`❌ Pull failed: ${err2.message}`);
      console.error("There may be conflicts. Check .context/ and resolve manually.");
      process.exit(1);
    }
  }
}
