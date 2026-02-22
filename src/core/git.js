import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Run a git command in the given directory. Returns stdout as string.
 */
export function git(args, cwd) {
  try {
    return execSync(`git ${args}`, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch (err) {
    throw new Error(`git ${args} failed: ${err.stderr?.trim() || err.message}`);
  }
}

/**
 * Check if directory is inside a git repo.
 */
export function isGitRepo(cwd) {
  try {
    git("rev-parse --is-inside-work-tree", cwd);
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize git in .context/ if not already in a git repo.
 */
export function initGit(contextDir) {
  if (!isGitRepo(contextDir)) {
    git("init", contextDir);
  }
}

/**
 * Stage and commit all changes in .context/.
 */
export function commitContext(contextDir, message) {
  git("add -A", contextDir);

  // Check if there are staged changes
  try {
    git("diff --cached --quiet", contextDir);
    return null; // nothing to commit
  } catch {
    // There are changes — commit them
  }

  git(`commit -m "${message.replace(/"/g, '\\"')}"`, contextDir);
  return git("rev-parse --short HEAD", contextDir);
}

/**
 * Get commit count in .context/ repo.
 */
export function commitCount(contextDir) {
  try {
    return parseInt(git("rev-list --count HEAD", contextDir), 10);
  } catch {
    return 0;
  }
}

/**
 * Get last commit info.
 */
export function lastCommit(contextDir) {
  try {
    const log = git('log -1 --format="%h|%s|%cr"', contextDir);
    const [hash, message, timeAgo] = log.split("|");
    return { hash, message, timeAgo };
  } catch {
    return null;
  }
}

/**
 * Check if there are uncommitted changes.
 */
export function hasChanges(contextDir) {
  try {
    const status = git("status --porcelain", contextDir);
    return status.length > 0;
  } catch {
    return false;
  }
}
