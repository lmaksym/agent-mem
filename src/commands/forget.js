import { existsSync, unlinkSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { contextDir as getContextDir } from '../core/context-root.js';
import { readContextFile, writeContextFile } from '../core/fs.js';
import { commitContext } from '../core/git.js';

/**
 * Normalize and validate a relative path within .context/.
 * Returns the normalized relative path or null if invalid.
 */
function safePath(ctxDir, inputPath) {
  const fullPath = resolve(ctxDir, inputPath);
  const rel = relative(ctxDir, fullPath);
  // Must not escape .context/ (no leading ..)
  if (rel.startsWith('..') || rel.startsWith('/')) return null;
  return rel;
}

export default async function forget({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  if (!args.length) {
    console.error('❌ Usage: agent-mem forget <path>');
    console.error('Remove a context file. Archived first for safety.');
    console.error('');
    console.error('Examples:');
    console.error('  agent-mem forget memory/notes.md');
    console.error('  agent-mem forget memory/old-patterns.md');
    console.error('');
    console.error('Cannot forget pinned (system/) files — unpin first.');
    process.exit(1);
  }

  // Normalize path to prevent traversal
  const relPath = safePath(ctxDir, args[0]);
  if (!relPath) {
    console.error('❌ Invalid path — must be inside .context/');
    process.exit(1);
  }

  // Safety: don't allow forgetting system files (normalized)
  if (relPath.startsWith('system/') || relPath === 'system') {
    console.error("❌ Cannot forget pinned files. Run 'agent-mem unpin' first.");
    process.exit(1);
  }

  // Safety: don't allow forgetting config
  if (relPath === 'config.yaml') {
    console.error('❌ Cannot forget config.yaml.');
    process.exit(1);
  }

  const fullPath = join(ctxDir, relPath);
  if (!existsSync(fullPath)) {
    console.error(`❌ File not found: .context/${relPath}`);
    process.exit(1);
  }

  // Archive before deleting
  const content = readContextFile(ctxDir, relPath);
  const today = new Date().toISOString().slice(0, 10);
  const archivePath = `archive/forgotten-${today}/${relPath}`;
  writeContextFile(ctxDir, archivePath, content);

  // Remove the file
  unlinkSync(fullPath);

  // Commit
  const hash = commitContext(ctxDir, `forget: removed ${relPath}`);

  console.log(`🗑️  FORGOT: ${relPath}`);
  console.log(`Archived: .context/${archivePath}`);
  if (hash) console.log(`Committed: ${hash}`);
  console.log('');
  console.log('To restore: agent-mem read ' + archivePath);
}
