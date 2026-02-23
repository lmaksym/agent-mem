import { contextDir as getContextDir } from '../core/context-root.js';
import { commitContext, hasChanges, commitCount, commitCountSince } from '../core/git.js';
import { readConfig } from '../core/config.js';
import { readContextFile } from '../core/fs.js';
import { acquireLock } from '../core/lock.js';

export default async function commit({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);
  const releaseLock = acquireLock(root);

  try {
    if (!hasChanges(ctxDir)) {
      console.log('ℹ️  No changes to commit.');
      return;
    }

    const message = args.length
      ? args.join(' ')
      : `checkpoint ${new Date().toISOString().slice(0, 16)}`;
    const hash = commitContext(ctxDir, message);

    if (!hash) {
      console.log('ℹ️  No changes to commit.');
      return;
    }

    const count = commitCount(ctxDir);
    console.log(`✅ COMMITTED: "${message}"`);
    console.log(`Commit: ${hash} | Total: ${count}`);

    // Check if reflection is due (auto-commit trigger)
    const config = readConfig(ctxDir);
    if (config.reflection?.trigger === 'auto-commit') {
      const freq = config.reflection?.frequency || 5;
      // Find last reflection's commit hash
      let sinceRef = null;
      const stateRaw = readContextFile(ctxDir, '.reflect-state.json');
      if (stateRaw) {
        try {
          sinceRef = JSON.parse(stateRaw).last_commit_hash;
        } catch {}
      }
      const sinceLast = sinceRef ? commitCountSince(ctxDir, sinceRef) : count;
      if (sinceLast >= freq) {
        console.log('');
        console.log(
          `📌 REFLECTION DUE: ${sinceLast} commits since last reflection. Run: amem reflect`,
        );
      }
    }
  } finally {
    releaseLock();
  }
}
