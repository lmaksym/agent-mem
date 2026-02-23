import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { contextDir as getContextDir } from '../core/context-root.js';
import { readContextFile, writeContextFile, listFiles } from '../core/fs.js';
import { commitContext, hasChanges } from '../core/git.js';
import { readConfig } from '../core/config.js';

/**
 * Calculate total byte size of all readable files in .context/.
 */
function contextByteSize(ctxDir) {
  let total = 0;
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (name.startsWith('.')) continue;
      const full = join(dir, name);
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else total += stat.size;
    }
  };
  walk(ctxDir);
  return total;
}

/**
 * Collect all entry lines from a memory file with dates.
 * Handles both bullet entries (- [date]) and block entries (### [date] for lessons).
 * Returns { header: string, entries: Array<{ line: string, date: Date|null, raw: string }> }
 */
function parseMemoryFile(content) {
  const lines = content.split('\n');
  const headerLines = [];
  const entries = [];
  let inHeader = true;
  let currentBlock = null;

  for (const line of lines) {
    // Block entry (lessons): ### [2026-02-21 14:30] Title
    const blockMatch = line.match(/^### \[(\d{4}-\d{2}-\d{2})[\s\d:]*\]\s*.+/);
    if (blockMatch) {
      // Push previous block if any
      if (currentBlock) {
        entries.push(currentBlock);
      }
      inHeader = false;
      currentBlock = {
        line: line,
        date: new Date(blockMatch[1]),
        raw: line,
        isStale: false,
        _blockLines: [line],
      };
      continue;
    }

    // If we're inside a block, accumulate lines
    if (currentBlock) {
      currentBlock._blockLines.push(line);
      currentBlock.line = currentBlock._blockLines.join('\n');
      currentBlock.raw = currentBlock.line;
      continue;
    }

    const entryMatch = line.match(/^- \[(\d{4}-\d{2}-\d{2})[\s\d:]*\]\s*.+/);
    // Also catch stale markers
    const staleMarker = line.match(/^- \[\d{4}-\d{2}-\d{2} STALE\]/);

    if (entryMatch) {
      inHeader = false;
      entries.push({
        line,
        date: new Date(entryMatch[1]),
        raw: line,
        isStale: false,
      });
    } else if (staleMarker) {
      inHeader = false;
      // Skip stale markers — they'll be dropped in compact
    } else if (inHeader || (!entryMatch && entries.length === 0)) {
      headerLines.push(line);
    }
    // Lines after entries that aren't entries (blank lines between entries, etc.)
  }

  // Push last block if any
  if (currentBlock) {
    entries.push(currentBlock);
  }

  return { header: headerLines.join('\n'), entries };
}

/**
 * Determine which memory entries to keep based on mode.
 * Default: keep entries from last 7 days + pinned file entries always kept.
 * Hard: discard all non-pinned memory entries.
 */
function selectEntries(entries, mode, config) {
  if (mode === 'hard') return []; // Hard mode: archive everything

  const retainDays = config.compact?.retain_days || 7;
  const cutoff = new Date(Date.now() - retainDays * 24 * 60 * 60 * 1000);

  return entries.filter((e) => e.date && e.date >= cutoff);
}

export default async function compact({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);
  const config = readConfig(ctxDir);

  const isDryRun = flags['dry-run'] === true;
  const isHard = flags.hard === true;
  const mode = isHard ? 'hard' : 'default';

  // 1. Measure before size
  const beforeBytes = contextByteSize(ctxDir);

  // 2. Safety checkpoint (auto-commit before compact)
  if (!isDryRun && hasChanges(ctxDir)) {
    const hash = commitContext(ctxDir, 'compact: pre-compact checkpoint');
    if (hash) {
      console.log(`💾 Pre-compact checkpoint: ${hash}`);
    }
  }

  // 3. Identify what to keep vs archive
  const kept = [];
  const archived = [];

  // 3a. System/ (pinned) — ALWAYS kept
  const systemFiles = listFiles(ctxDir, 'system');
  for (const name of systemFiles) {
    kept.push({ path: `system/${name}`, reason: 'pinned' });
  }

  // 3b. Memory files — filter entries by recency (or archive all in hard mode)
  const memDir = join(ctxDir, 'memory');
  if (existsSync(memDir)) {
    const memFiles = readdirSync(memDir).filter((n) => n.endsWith('.md') && !n.startsWith('.'));

    for (const name of memFiles) {
      const relPath = `memory/${name}`;
      const content = readContextFile(ctxDir, relPath);
      if (!content) continue;

      const { header, entries } = parseMemoryFile(content);
      const keepEntries = selectEntries(entries, mode, config);
      const dropEntries = entries.filter((e) => !keepEntries.includes(e));

      if (dropEntries.length > 0) {
        archived.push({
          path: relPath,
          entriesDropped: dropEntries.length,
          entriesKept: keepEntries.length,
          reason: mode === 'hard' ? 'hard mode' : 'stale (older than retain window)',
        });
      }

      if (keepEntries.length > 0) {
        kept.push({
          path: relPath,
          entries: keepEntries.length,
          reason: mode === 'hard' ? 'n/a' : 'recent',
        });
      }

      // Apply changes (if not dry run)
      if (!isDryRun && dropEntries.length > 0) {
        // Archive dropped entries
        const archivePath = `archive/compact-${new Date().toISOString().slice(0, 10)}/${name}`;
        const archiveContent = header + '\n' + dropEntries.map((e) => e.line).join('\n') + '\n';
        writeContextFile(ctxDir, archivePath, archiveContent);

        if (keepEntries.length > 0) {
          // Rewrite memory file with only kept entries
          const newContent = header + '\n' + keepEntries.map((e) => e.line).join('\n') + '\n';
          writeContextFile(ctxDir, relPath, newContent);
        } else {
          // Archive entire file — rewrite as empty with header only
          writeContextFile(ctxDir, relPath, header + '\n');
        }
      }
    }
  }

  // 3c. Reflections — archive all except latest in default, archive all in hard
  const refDir = join(ctxDir, 'reflections');
  if (existsSync(refDir)) {
    const refFiles = readdirSync(refDir)
      .filter((n) => n.endsWith('.md'))
      .sort();
    const keepCount = mode === 'hard' ? 0 : 1;
    const toArchive = refFiles.slice(0, refFiles.length - keepCount);
    const toKeep = refFiles.slice(refFiles.length - keepCount);

    for (const name of toKeep) {
      kept.push({ path: `reflections/${name}`, reason: 'latest reflection' });
    }

    for (const name of toArchive) {
      archived.push({ path: `reflections/${name}`, reason: 'older reflection' });

      if (!isDryRun) {
        const relPath = `reflections/${name}`;
        const content = readContextFile(ctxDir, relPath);
        const archivePath = `archive/compact-${new Date().toISOString().slice(0, 10)}/${relPath}`;
        writeContextFile(ctxDir, archivePath, content);
        // Remove original after archiving
        const fullPath = join(ctxDir, relPath);
        if (existsSync(fullPath)) {
          unlinkSync(fullPath);
        }
      }
    }
  }

  // 3d. Branches metadata — always kept (lightweight)
  const branchDir = join(ctxDir, 'branches');
  if (existsSync(branchDir)) {
    const branches = readdirSync(branchDir).filter((n) => {
      const full = join(branchDir, n);
      return existsSync(full) && statSync(full).isDirectory();
    });
    if (branches.length > 0) {
      kept.push({ path: 'branches/', reason: 'branch metadata', count: branches.length });
    }
  }

  // 3e. Config — always kept
  if (existsSync(join(ctxDir, 'config.yaml'))) {
    kept.push({ path: 'config.yaml', reason: 'configuration' });
  }

  // 4. Measure after size
  const afterBytes = isDryRun ? beforeBytes : contextByteSize(ctxDir);

  // 5. Commit compaction
  let commitHash = null;
  if (!isDryRun && archived.length > 0) {
    const msg =
      mode === 'hard'
        ? `compact --hard: archived ${archived.length} items, kept pins only`
        : `compact: archived ${archived.length} items, kept recent + pins`;
    commitHash = commitContext(ctxDir, msg);
  }

  // 6. Output report
  const marker = isDryRun ? ' (dry run)' : '';
  const modeLabel = mode === 'hard' ? ' --hard' : '';
  console.log(`🗜️  COMPACT${modeLabel}${marker}`);
  console.log('');

  if (kept.length > 0) {
    console.log('KEPT:');
    for (const k of kept) {
      const extra = k.entries ? ` (${k.entries} entries)` : k.count ? ` (${k.count})` : '';
      console.log(`  ✅ ${k.path}${extra} — ${k.reason}`);
    }
    console.log('');
  }

  if (archived.length > 0) {
    console.log('ARCHIVED:');
    for (const a of archived) {
      const extra = a.entriesDropped
        ? ` (${a.entriesDropped} entries dropped, ${a.entriesKept} kept)`
        : '';
      console.log(`  📦 ${a.path}${extra} — ${a.reason}`);
    }
    console.log('');
  }

  if (archived.length === 0) {
    console.log('Nothing to compact — context is already lean.');
    console.log('');
  }

  // Token delta (byte-based approximation)
  const delta = beforeBytes - afterBytes;
  const pct = beforeBytes > 0 ? ((delta / beforeBytes) * 100).toFixed(1) : '0.0';
  console.log(
    `SIZE: ${formatBytes(beforeBytes)} → ${formatBytes(afterBytes)} (${delta > 0 ? '-' : '+'}${formatBytes(Math.abs(delta))}, ${pct}% reduction)`,
  );

  if (!isDryRun && archived.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    console.log(`ARCHIVE: .context/archive/compact-${today}/`);
  }

  if (commitHash) {
    console.log(`COMMIT: ${commitHash}`);
  }

  if (isDryRun && archived.length > 0) {
    console.log('');
    console.log('Run without --dry-run to apply.');
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
