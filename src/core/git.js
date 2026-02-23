import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Run a git command in the given directory. Returns stdout as string.
 */
export function git(args, cwd) {
  try {
    return execSync(`git ${args}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (err) {
    throw new Error(`git ${args} failed: ${err.stderr?.trim() || err.message}`);
  }
}

/**
 * Check if directory is inside a git repo.
 */
export function isGitRepo(cwd) {
  try {
    git('rev-parse --is-inside-work-tree', cwd);
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
    git('init', contextDir);
  }
}

/**
 * Stage and commit all changes in .context/.
 */
export function commitContext(contextDir, message) {
  git('add -A', contextDir);

  // Check if there are staged changes
  try {
    git('diff --cached --quiet', contextDir);
    return null; // nothing to commit
  } catch {
    // There are changes — commit them
  }

  git(`commit -m "${message.replace(/"/g, '\\"')}"`, contextDir);
  return git('rev-parse --short HEAD', contextDir);
}

/**
 * Get commit count in .context/ repo.
 */
export function commitCount(contextDir) {
  try {
    return parseInt(git('rev-list --count HEAD', contextDir), 10);
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
    const [hash, message, timeAgo] = log.split('|');
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
    const status = git('status --porcelain', contextDir);
    return status.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get commit log since a ref. Returns array of { hash, message, date }.
 * If sinceRef is null, returns all commits.
 */
export function gitLog(contextDir, sinceRef, maxCount = 50) {
  try {
    const range = sinceRef ? `${sinceRef}..HEAD` : 'HEAD';
    const raw = git(`log ${range} --format="%h|%s|%ai" -n ${maxCount}`, contextDir);
    if (!raw) return [];
    return raw.split('\n').map((line) => {
      const [hash, message, date] = line.split('|');
      return { hash, message, date };
    });
  } catch {
    return [];
  }
}

/**
 * Get total commit count since a ref.
 */
export function commitCountSince(contextDir, sinceRef) {
  try {
    if (!sinceRef) return commitCount(contextDir);
    const raw = git(`rev-list --count ${sinceRef}..HEAD`, contextDir);
    return parseInt(raw, 10);
  } catch {
    return 0;
  }
}

/**
 * Get diff stats since a ref. Returns array of { file, added, removed }.
 */
export function gitDiffStat(contextDir, sinceRef) {
  try {
    const range = sinceRef ? `${sinceRef}..HEAD` : `$(git rev-list --max-parents=0 HEAD)..HEAD`;
    const raw = git(`diff --numstat ${range}`, contextDir);
    if (!raw) return [];
    return raw
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [added, removed, file] = line.split('\t');
        return {
          file,
          added: added === '-' ? 0 : parseInt(added, 10),
          removed: removed === '-' ? 0 : parseInt(removed, 10),
        };
      });
  } catch {
    return [];
  }
}

/**
 * Get full diff for specific path since a ref.
 */
export function gitDiffFiles(contextDir, sinceRef, path) {
  try {
    const range = sinceRef ? `${sinceRef}..HEAD` : `$(git rev-list --max-parents=0 HEAD)..HEAD`;
    return git(`diff ${range} -- ${path}`, contextDir);
  } catch {
    return '';
  }
}

/**
 * Get file content at a specific ref.
 */
export function gitShowFile(contextDir, ref, path) {
  try {
    return git(`show ${ref}:${path}`, contextDir);
  } catch {
    return null;
  }
}

/**
 * Get the first commit hash in the repo.
 */
export function firstCommit(contextDir) {
  try {
    return git('rev-list --max-parents=0 HEAD', contextDir).split('\n')[0];
  } catch {
    return null;
  }
}
