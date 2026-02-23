import { readConfig } from './config.js';
import { commitContext, commitCount } from './git.js';

/**
 * Check if auto-commit should fire, and commit if so.
 * Tracks mutations via commit count modulo interval.
 */
export function maybeAutoCommit(contextDir, changeDescription) {
  const config = readConfig(contextDir);
  if (!config.auto_commit) return;

  const interval = config.auto_commit_interval || 10;
  const count = commitCount(contextDir);

  // Simple heuristic: commit if we have uncommitted changes
  // and count of commits since last is divisible by interval
  // For now: just auto-commit every mutation when enabled
  const hash = commitContext(contextDir, `auto: ${changeDescription}`);
  if (hash) {
    console.log(`  ⚡ Auto-committed: ${hash}`);
  }
}
