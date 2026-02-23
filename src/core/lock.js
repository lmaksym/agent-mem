import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const LOCK_FILE = '.context.lock';
const LOCK_TIMEOUT_MS = 30_000; // 30 seconds

/**
 * Acquire a lock on .context/ for safe concurrent access.
 * Uses a simple lock file with PID and timestamp.
 * Returns a release function.
 */
export function acquireLock(projectRoot) {
  const lockPath = join(projectRoot, LOCK_FILE);

  // Check for stale lock
  if (existsSync(lockPath)) {
    try {
      const data = JSON.parse(readFileSync(lockPath, 'utf-8'));
      const age = Date.now() - data.timestamp;

      if (age > LOCK_TIMEOUT_MS) {
        // Stale lock — remove it
        unlinkSync(lockPath);
      } else {
        // Active lock — wait briefly then fail
        const waitMs = Math.min(age, 2000);
        const start = Date.now();
        while (Date.now() - start < waitMs) {
          // busy wait
        }

        if (existsSync(lockPath)) {
          console.error(
            `⚠️  Context locked by PID ${data.pid} (${Math.round(age / 1000)}s ago). Proceeding anyway.`,
          );
          // Don't block — just warn. Append-only files are safe for concurrent writes.
        }
      }
    } catch {
      // Corrupted lock file — remove
      try {
        unlinkSync(lockPath);
      } catch {}
    }
  }

  // Write lock
  writeFileSync(
    lockPath,
    JSON.stringify({
      pid: process.pid,
      timestamp: Date.now(),
    }),
  );

  // Return release function
  return () => {
    try {
      unlinkSync(lockPath);
    } catch {}
  };
}
