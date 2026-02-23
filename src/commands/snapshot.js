import { join } from 'node:path';
import { contextDir as getContextDir } from '../core/context-root.js';
import { buildTree, readContextFile, countFiles } from '../core/fs.js';
import { readConfig } from '../core/config.js';
import { commitCount, lastCommit, hasChanges } from '../core/git.js';

export default async function snapshot({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);
  const config = readConfig(ctxDir);
  const projectName = root.split('/').pop();

  const commits = commitCount(ctxDir);
  const last = lastCommit(ctxDir);
  const dirty = hasChanges(ctxDir);
  const branch = config.branch || 'main';

  const tree = buildTree(ctxDir);

  // Header
  const lines = [
    `📋 CONTEXT SNAPSHOT`,
    `Project: ${projectName} | Branch: ${branch} | Commits: ${commits}${dirty ? ' (uncommitted changes)' : ''}`,
    last ? `Last commit: "${last.message}" (${last.timeAgo})` : '',
    '',
  ];

  // System files (pinned — show full content)
  const systemFiles = tree.filter((e) => e.path.startsWith('system/') && !e.isDir);
  if (systemFiles.length) {
    lines.push('PINNED (system/) — always in agent context:');
    for (const f of systemFiles) {
      const content = readContextFile(ctxDir, f.path);
      if (content) {
        // Strip frontmatter for display
        const stripped = content.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
        const preview = stripped.length > 500 ? stripped.slice(0, 497) + '...' : stripped;
        lines.push(`  --- ${f.path} ---`);
        lines.push(`  ${preview.split('\n').join('\n  ')}`);
        lines.push('');
      }
    }
  }

  // Memory files — branch-scoped when on a branch
  const branchMemPrefix = branch !== 'main' ? `branches/${branch}/memory/` : null;
  const branchMemFiles = branchMemPrefix
    ? tree.filter((e) => e.path.startsWith(branchMemPrefix) && !e.isDir)
    : [];
  const globalMemFiles = tree.filter((e) => e.path.startsWith('memory/') && !e.isDir);

  if (branchMemPrefix && branchMemFiles.length) {
    lines.push(`MEMORY [branch: ${branch}] (${branchMemFiles.length} files):`);
    for (const f of branchMemFiles) {
      lines.push(`  ${f.name} — ${f.description || '(no description)'}`);
    }
    lines.push('');
  }

  if (branchMemPrefix && globalMemFiles.length) {
    lines.push(
      `MEMORY [main] (${globalMemFiles.length} files — use 'amem read memory/<file>' for global):`,
    );
    for (const f of globalMemFiles) {
      lines.push(`  ${f.name} — ${f.description || '(no description)'}`);
    }
    lines.push('');
  } else if (!branchMemPrefix && globalMemFiles.length) {
    lines.push(`MEMORY (${globalMemFiles.length} files):`);
    for (const f of globalMemFiles) {
      lines.push(`  ${f.name} — ${f.description || '(no description)'}`);
    }
    lines.push('');
  }

  // Branches
  const branchEntries = tree.filter(
    (e) => e.path.startsWith('branches/') && e.isDir && e.depth === 1,
  );
  if (branchEntries.length) {
    lines.push(`BRANCHES (${branchEntries.length}):`);
    for (const b of branchEntries) {
      const purpose = readContextFile(ctxDir, `${b.path}/purpose.md`);
      const purposeLine =
        purpose?.split('\n').find((l) => l.trim() && !l.startsWith('#') && !l.startsWith('---')) ||
        '';
      lines.push(`  ${b.name} — ${purposeLine.trim() || '(no purpose set)'}`);
    }
    lines.push('');
  }

  // Reflections
  const reflectionFiles = tree.filter((e) => e.path.startsWith('reflections/') && !e.isDir);
  if (reflectionFiles.length) {
    const latest = reflectionFiles[reflectionFiles.length - 1];
    lines.push(`REFLECTIONS: ${reflectionFiles.length} total, latest: ${latest.name}`);
    lines.push('');
  }

  // Config summary
  lines.push(
    `CONFIG: auto_commit=${config.auto_commit} | reflection=${config.reflection?.trigger || 'manual'}`,
  );

  console.log(lines.filter((l) => l !== undefined).join('\n'));
}
