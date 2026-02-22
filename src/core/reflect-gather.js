import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readContextFile, writeContextFile, parseFrontmatter, listFiles } from "./fs.js";
import { readConfig } from "./config.js";
import { gitLog, gitDiffStat, gitDiffFiles, commitCountSince, firstCommit, lastCommit } from "./git.js";

/**
 * Determine the "since" reference for the reflection window.
 * Priority: --since flag > last reflection's last_commit_hash > first commit
 */
export function resolveSinceRef(ctxDir, flags) {
  // Explicit --since flag
  if (flags.since) return flags.since;

  // Check .reflect-state.json for last saved state
  const stateRaw = readContextFile(ctxDir, ".reflect-state.json");
  if (stateRaw) {
    try {
      const state = JSON.parse(stateRaw);
      if (state.last_commit_hash) return state.last_commit_hash;
    } catch {}
  }

  // Check most recent reflection file's frontmatter
  const reflections = getReflectionFiles(ctxDir);
  if (reflections.length > 0) {
    const latest = readContextFile(ctxDir, reflections[reflections.length - 1]);
    if (latest) {
      const { description } = parseFrontmatter(latest);
      // parseFrontmatter gives us description but we need the raw frontmatter
      const match = latest.match(/^---\n([\s\S]*?)\n---/);
      if (match) {
        const hashMatch = match[1].match(/last_commit_hash:\s*['"]?(\w+)['"]?/);
        if (hashMatch) return hashMatch[1];
      }
    }
  }

  // Fall back to first commit
  return firstCommit(ctxDir);
}

/**
 * Get sorted list of reflection file paths (relative to ctxDir).
 */
export function getReflectionFiles(ctxDir) {
  const dir = join(ctxDir, "reflections");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.endsWith(".md") && !n.startsWith("."))
    .sort()
    .map((n) => `reflections/${n}`);
}

/**
 * Count entries in a memory file (lines matching `^- [`).
 */
function countEntries(content) {
  if (!content) return 0;
  return content.split("\n").filter((l) => /^- \[/.test(l)).length;
}

/**
 * Get last entry date from a memory file.
 */
function lastEntryDate(content) {
  if (!content) return null;
  const lines = content.split("\n").filter((l) => /^- \[/.test(l));
  if (!lines.length) return null;
  const match = lines[lines.length - 1].match(/^- \[(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Analyze all memory files. Returns array of { file, entries, size, lastDate, content }.
 */
function analyzeMemoryFiles(ctxDir) {
  const memDir = join(ctxDir, "memory");
  if (!existsSync(memDir)) return [];

  return readdirSync(memDir)
    .filter((n) => n.endsWith(".md") && !n.startsWith("."))
    .sort()
    .map((name) => {
      const content = readContextFile(ctxDir, `memory/${name}`);
      const stat = statSync(join(memDir, name));
      return {
        file: `memory/${name}`,
        entries: countEntries(content),
        size: stat.size,
        lastDate: lastEntryDate(content),
        content,
      };
    });
}

/**
 * Analyze branch lifecycle. Returns { active, merged }.
 */
function analyzeBranches(ctxDir) {
  const branchDir = join(ctxDir, "branches");
  if (!existsSync(branchDir)) return { active: [], merged: [] };

  const config = readConfig(ctxDir);
  const active = [];
  const merged = [];

  for (const name of readdirSync(branchDir).filter((n) => !n.startsWith("."))) {
    const purposeRaw = readContextFile(ctxDir, `branches/${name}/purpose.md`);
    const purpose = purposeRaw
      ? purposeRaw.split("\n").filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("---"))[0]?.trim() || name
      : name;

    // Check if branch was merged (look for merge entry in decisions.md)
    const decisions = readContextFile(ctxDir, "memory/decisions.md") || "";
    const mergePattern = new RegExp(`Merged branch: ${name}`, "i");
    if (mergePattern.test(decisions)) {
      merged.push({ name, purpose });
    } else {
      active.push({ name, purpose, isCurrent: config.branch === name });
    }
  }

  return { active, merged };
}

/**
 * Get the last reflection summary text.
 */
function getLastReflectionSummary(ctxDir) {
  const files = getReflectionFiles(ctxDir);
  if (!files.length) return null;

  const content = readContextFile(ctxDir, files[files.length - 1]);
  if (!content) return null;

  const { content: body } = parseFrontmatter(content);
  // Extract Summary section
  const match = body.match(/## Summary\n([\s\S]*?)(?=\n## |\n$|$)/);
  const summary = match ? match[1].trim() : null;

  // Extract frontmatter date
  const dateMatch = content.match(/date:\s*['"]?(\d{4}-\d{2}-\d{2})['"]?/);
  const date = dateMatch ? dateMatch[1] : files[files.length - 1].replace("reflections/", "").replace(".md", "");

  return { date, file: files[files.length - 1], summary };
}

/**
 * Format file size for display.
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}

/**
 * Gather all reflection data and format the prompt.
 */
export function gatherReflectionPrompt(ctxDir, flags) {
  const sinceRef = resolveSinceRef(ctxDir, flags);
  const totalCommits = commitCountSince(ctxDir, sinceRef);

  // Early exit if no activity
  if (totalCommits === 0) {
    return { empty: true, sinceRef };
  }

  const commits = gitLog(ctxDir, sinceRef, 50);
  const diffStats = gitDiffStat(ctxDir, sinceRef);
  const memoryFiles = analyzeMemoryFiles(ctxDir);
  const branches = analyzeBranches(ctxDir);
  const lastReflection = getLastReflectionSummary(ctxDir);
  const last = lastCommit(ctxDir);

  // Determine window dates
  const windowEnd = new Date().toISOString().slice(0, 10);
  const windowStart = commits.length > 0
    ? commits[commits.length - 1].date?.slice(0, 10) || "unknown"
    : "unknown";

  // Write breadcrumb state for save phase
  const state = {
    window_start: windowStart,
    window_end: windowEnd,
    commits_reviewed: totalCommits,
    last_commit_hash: last?.hash || null,
    since_ref: sinceRef,
    gathered_at: new Date().toISOString(),
  };
  writeContextFile(ctxDir, ".reflect-state.json", JSON.stringify(state, null, 2));

  // Build prompt
  const lines = [];

  lines.push("🔍 REFLECTION INPUT");
  lines.push(`Window: ${windowStart} → ${windowEnd} (${totalCommits} commits)`);
  lines.push(`Last reflection: ${lastReflection ? `${lastReflection.date} (${lastReflection.file})` : "none (first reflection)"}`);
  lines.push("");

  // === RECENT ACTIVITY ===
  lines.push("═══ RECENT ACTIVITY ═══");
  lines.push("");

  lines.push(`COMMITS (${totalCommits}):`);
  for (let i = 0; i < commits.length; i++) {
    const c = commits[i];
    lines.push(`  ${i + 1}. ${c.hash} | ${c.message} | ${c.date?.slice(0, 16) || ""}`);
  }
  if (totalCommits > 50) {
    lines.push(`  ... and ${totalCommits - 50} earlier commits`);
  }
  lines.push("");

  if (diffStats.length > 0) {
    lines.push("FILES CHANGED:");
    for (const d of diffStats) {
      lines.push(`  ${d.file}  +${d.added} -${d.removed} lines`);
    }
    lines.push("");
  }

  // Deep mode: include full diffs for memory files
  if (flags.deep && sinceRef) {
    const memoryDiff = gitDiffFiles(ctxDir, sinceRef, "memory/");
    if (memoryDiff) {
      lines.push("MEMORY DIFFS (--deep):");
      lines.push(memoryDiff);
      lines.push("");
    }
  }

  // Branches
  if (branches.merged.length > 0 || branches.active.length > 0) {
    lines.push("BRANCHES:");
    for (const b of branches.merged) {
      lines.push(`  MERGED: ${b.name} → "${b.purpose}"`);
    }
    for (const b of branches.active) {
      lines.push(`  ACTIVE: ${b.name}${b.isCurrent ? " *" : ""} → "${b.purpose}"`);
    }
    lines.push("");
  }

  // === CURRENT MEMORY STATE ===
  lines.push("═══ CURRENT MEMORY STATE ═══");
  lines.push("");

  if (memoryFiles.length === 0) {
    lines.push("(no memory files yet)");
  } else {
    for (const mf of memoryFiles) {
      lines.push(`${mf.file} (${mf.entries} entries, ${formatSize(mf.size)}):`);
      if (mf.entries === 0) {
        lines.push("  (empty)");
      } else {
        // Show all entries for cross-reference
        const entryLines = mf.content.split("\n").filter((l) => /^- \[/.test(l));
        for (const entry of entryLines) {
          lines.push(`  ${entry}`);
        }
      }
      lines.push("");
    }
  }

  // === LAST REFLECTION ===
  lines.push("═══ LAST REFLECTION ═══");
  lines.push("");
  if (lastReflection) {
    lines.push(`(from ${lastReflection.file})`);
    lines.push(lastReflection.summary || "(no summary)");
  } else {
    lines.push("First reflection — no prior context.");
    lines.push("");
    lines.push("This is your first reflection for this project. Focus on:");
    lines.push("1. Are the memory entries so far capturing the RIGHT things?");
    lines.push("2. Are any decisions already outdated?");
    lines.push("3. What implicit knowledge about this project have you NOT written down?");
    lines.push("4. Are the system/ files (conventions, project overview) still accurate?");
  }
  lines.push("");

  // === COMPACTION MODE ===
  if (flags.compaction) {
    lines.push("═══ COMPACTION MODE ═══");
    lines.push("Your context window is filling up. Focus on:");
    lines.push("1. Summarize work into concise status (not deep analysis)");
    lines.push("2. Identify memory entries to archive");
    lines.push("3. Identify system/ files to shorten or unpin");
    lines.push("4. After saving, consider unpinning less critical system files");
    lines.push("");
  }

  // === REFLECTION QUESTIONS ===
  lines.push("═══ REFLECTION QUESTIONS ═══");
  lines.push("");
  lines.push("1. PATTERNS: What recurring approaches or successful strategies emerged?");
  lines.push("2. CONTRADICTIONS: Do any new entries conflict with existing ones?");
  lines.push("3. CONSOLIDATION: Can entries be merged, clarified, or made more specific?");
  lines.push("4. GAPS: What important context is NOT yet captured?");
  lines.push("5. THEMES: What overarching directions are emerging?");
  lines.push("6. STALE: Are any existing entries outdated?");
  lines.push("");

  // === INSTRUCTIONS ===
  lines.push("═══ INSTRUCTIONS ═══");
  lines.push("");
  lines.push("After reasoning, call:");
  lines.push('  amem reflect save --content "YOUR_REFLECTION"');
  lines.push("");
  lines.push("Use this format:");
  lines.push("");
  lines.push("## Patterns Identified");
  lines.push("- <pattern>");
  lines.push("");
  lines.push("## Decisions Validated");
  lines.push("- <decision confirmed by recent work>");
  lines.push("");
  lines.push("## Contradictions Found");
  lines.push("- <what conflicts, and resolution>");
  lines.push("");
  lines.push("## Stale Entries");
  lines.push("- <file>: <entry to flag>");
  lines.push("");
  lines.push("## Gaps Filled");
  lines.push("- type: decision|pattern|mistake|note");
  lines.push("  text: <new entry to add>");
  lines.push("");
  lines.push("## Themes");
  lines.push("- <overarching theme>");
  lines.push("");
  lines.push("## Summary");
  lines.push("<2-3 sentence summary>");

  return { empty: false, prompt: lines.join("\n"), state };
}
