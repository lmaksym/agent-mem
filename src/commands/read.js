import { contextDir as getContextDir } from '../core/context-root.js';
import { readContextFile } from '../core/fs.js';
import { readConfig } from '../core/config.js';

export default async function read({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  if (!args.length) {
    console.error('❌ Usage: agent-mem read <path>');
    console.error('Example: agent-mem read memory/decisions.md');
    process.exit(1);
  }

  const relPath = args[0];
  const config = readConfig(ctxDir);
  const branch = config.branch || 'main';

  // When on a branch and reading memory/, try branch-local first
  let content = null;
  if (branch !== 'main' && relPath.startsWith('memory/')) {
    const branchPath = relPath.replace(/^memory\//, `branches/${branch}/memory/`);
    content = readContextFile(ctxDir, branchPath);
    if (content !== null) {
      console.log(`(reading from branch: ${branch})\n`);
    }
  }

  // Fall back to the exact path requested
  if (content === null) {
    content = readContextFile(ctxDir, relPath);
  }

  if (content === null) {
    console.error(`❌ File not found: .context/${relPath}`);
    process.exit(1);
  }

  // --last N: show only the last N entries (lines matching ^- [)
  const last = parseInt(flags.last, 10);
  if (last > 0) {
    const lines = content.split('\n');
    const entryIndices = [];
    for (let i = 0; i < lines.length; i++) {
      if (/^- \[/.test(lines[i])) entryIndices.push(i);
    }
    if (entryIndices.length > last) {
      const cutoff = entryIndices[entryIndices.length - last];
      // Keep header (everything before first entry) + last N entries
      const headerEnd = entryIndices[0];
      const header = lines.slice(0, headerEnd).join('\n');
      const entries = lines.slice(cutoff).join('\n');
      const skipped = entryIndices.length - last;
      console.log(
        header + `(${skipped} older entries hidden — showing last ${last})\n\n` + entries,
      );
      return;
    }
  }

  console.log(content);
}
