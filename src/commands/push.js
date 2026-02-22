import { contextDir as getContextDir } from "../core/context-root.js";
import { git, isGitRepo, hasChanges, commitContext } from "../core/git.js";

/**
 * Push .context/ to its own remote repository.
 * 
 * agent-context push                     — push to configured remote
 * agent-context push --remote <url>      — set remote and push
 */
export default async function push({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  if (!isGitRepo(ctxDir)) {
    console.error("❌ .context/ is not a git repo. Run 'agent-context init' first.");
    process.exit(1);
  }

  // Set remote if provided
  if (flags.remote) {
    try {
      git("remote remove origin", ctxDir);
    } catch {}
    git(`remote add origin ${flags.remote}`, ctxDir);
    console.log(`  🔗 Remote set: ${flags.remote}`);
  }

  // Check if remote exists
  let remoteUrl;
  try {
    remoteUrl = git("remote get-url origin", ctxDir);
  } catch {
    console.error("❌ No remote configured. Use: agent-context push --remote <git-url>");
    console.error("");
    console.error("Example:");
    console.error("  agent-context push --remote git@github.com:user/myproject-context.git");
    console.error("  agent-context push --remote https://github.com/user/myproject-context.git");
    process.exit(1);
  }

  // Auto-commit if there are changes
  if (hasChanges(ctxDir)) {
    const hash = commitContext(ctxDir, `sync: ${new Date().toISOString().slice(0, 16)}`);
    if (hash) console.log(`  ⚡ Auto-committed: ${hash}`);
  }

  // Ensure branch exists
  try {
    git("rev-parse HEAD", ctxDir);
  } catch {
    console.error("❌ No commits yet. Run some commands first, then push.");
    process.exit(1);
  }

  // Get current branch name
  let branch;
  try {
    branch = git("branch --show-current", ctxDir);
  } catch {
    branch = "main";
  }

  // Push
  try {
    console.log(`  ⬆️  Pushing to ${remoteUrl}...`);
    git(`push -u origin ${branch}`, ctxDir);
    console.log(`\n✅ PUSHED: .context/ → ${remoteUrl}`);
    console.log(`Other machines can now: agent-context pull`);
  } catch (err) {
    // First push might need --set-upstream or force
    try {
      git(`push --set-upstream origin ${branch}`, ctxDir);
      console.log(`\n✅ PUSHED: .context/ → ${remoteUrl}`);
    } catch (err2) {
      console.error(`❌ Push failed: ${err2.message}`);
      console.error("Try: agent-context push --remote <url> (to reconfigure)");
      process.exit(1);
    }
  }
}
