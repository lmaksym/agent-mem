import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { readContextFile, writeContextFile, parseFrontmatter } from "./fs.js";
import { readConfig } from "./config.js";
import { commitContext } from "./git.js";
import { getReflectionFiles } from "./reflect-gather.js";

/**
 * Tokenize a string into a set of lowercase words.
 */
function wordSet(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

/**
 * Jaccard similarity between two word sets.
 */
function jaccard(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Parse entry lines from a memory file. Returns array of { line, date, text }.
 */
function parseEntries(content) {
  if (!content) return [];
  const entries = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^- \[(\d{4}-\d{2}-\d{2})[\s\d:]*\]\s*(.+)/);
    if (match) {
      entries.push({ line: i + 1, date: match[1], text: match[2] });
    }
  }
  return entries;
}

/**
 * Get all text from reflections that "reaffirm" entries (Decisions Validated, Patterns Identified).
 */
function getReaffirmedText(ctxDir) {
  const files = getReflectionFiles(ctxDir);
  const texts = [];
  for (const f of files) {
    const raw = readContextFile(ctxDir, f);
    if (!raw) continue;
    // Extract relevant sections
    const content = parseFrontmatter(raw).content;
    const sectionMatch = content.match(/## (?:Patterns Identified|Decisions Validated)\n([\s\S]*?)(?=\n## |\n$|$)/g);
    if (sectionMatch) {
      texts.push(...sectionMatch);
    }
  }
  return texts.join("\n").toLowerCase();
}

/**
 * Run defrag analysis on memory files.
 * Returns { oversized, duplicates, stale, structural, health, issueCount }.
 */
export function analyzeDefrag(ctxDir) {
  const config = readConfig(ctxDir);
  const threshold = config.reflection?.defrag_threshold || 50;
  const sizeKb = config.reflection?.defrag_size_kb || 10;
  const staleDays = config.reflection?.stale_days || 30;

  const memDir = join(ctxDir, "memory");
  if (!existsSync(memDir)) {
    return { oversized: [], duplicates: [], stale: [], structural: [], health: "GOOD", issueCount: 0 };
  }

  const files = readdirSync(memDir)
    .filter((n) => n.endsWith(".md") && !n.startsWith("."))
    .sort();

  const oversized = [];
  const duplicates = [];
  const stale = [];
  const structural = [];

  const reaffirmed = getReaffirmedText(ctxDir);
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - staleDays * 24 * 60 * 60 * 1000);

  for (const name of files) {
    const relPath = `memory/${name}`;
    const content = readContextFile(ctxDir, relPath);
    if (!content) continue;

    const stat = statSync(join(memDir, name));
    const entries = parseEntries(content);
    const { description } = parseFrontmatter(content);

    // Check oversized
    if (entries.length > threshold || stat.size > sizeKb * 1024) {
      oversized.push({
        file: relPath,
        entries: entries.length,
        size: stat.size,
        sizeFormatted: `${(stat.size / 1024).toFixed(1)}KB`,
      });
    }

    // Check structural issues
    if (!description && entries.length > 0) {
      structural.push({ file: relPath, issue: "missing frontmatter (description)" });
    }
    if (entries.length === 0 && content.trim().split("\n").length <= 6) {
      structural.push({ file: relPath, issue: "empty (no entries)" });
    }

    // Check duplicates within the same file
    for (let i = 0; i < entries.length; i++) {
      const wordsI = wordSet(entries[i].text);
      for (let j = i + 1; j < entries.length; j++) {
        const wordsJ = wordSet(entries[j].text);
        const sim = jaccard(wordsI, wordsJ);
        if (sim >= 0.6) {
          duplicates.push({
            file: relPath,
            lineA: entries[i].line,
            lineB: entries[j].line,
            textA: entries[i].text.slice(0, 80),
            textB: entries[j].text.slice(0, 80),
            similarity: sim,
          });
        }
      }
    }

    // Check stale entries
    for (const entry of entries) {
      const entryDate = new Date(entry.date);
      if (entryDate < staleThreshold) {
        // Check if this entry was reaffirmed in any reflection
        const entryLower = entry.text.toLowerCase();
        const isReaffirmed = reaffirmed.includes(entryLower.slice(0, 30));
        if (!isReaffirmed) {
          stale.push({
            file: relPath,
            line: entry.line,
            date: entry.date,
            text: entry.text.slice(0, 80),
          });
        }
      }
    }
  }

  const issueCount = oversized.length + duplicates.length + stale.length + structural.length;
  const health = issueCount === 0 ? "GOOD" : issueCount <= 3 ? "FAIR" : "NEEDS_ATTENTION";

  return { oversized, duplicates, stale, structural, health, issueCount };
}

/**
 * Format defrag analysis as output text.
 */
export function formatDefragOutput(analysis, isDryRun) {
  const lines = [];
  const marker = isDryRun ? " (dry run — no changes)" : "";
  lines.push(`🔧 DEFRAG ANALYSIS${marker}`);
  lines.push("");

  // Oversized
  if (analysis.oversized.length > 0) {
    lines.push("OVERSIZED FILES:");
    for (const o of analysis.oversized) {
      lines.push(`  ${o.file} — ${o.entries} entries, ${o.sizeFormatted}`);
      lines.push(`  ⤷ Suggest: split by domain or time period`);
    }
    lines.push("");
  }

  // Duplicates
  if (analysis.duplicates.length > 0) {
    lines.push("POTENTIAL DUPLICATES:");
    for (const d of analysis.duplicates) {
      lines.push(`  ${d.file} line ${d.lineA} ↔ line ${d.lineB} (${(d.similarity * 100).toFixed(0)}% similar)`);
      lines.push(`    "${d.textA}"`);
      lines.push(`    "${d.textB}"`);
      lines.push(`  ⤷ Suggest: merge into single, more specific entry`);
    }
    lines.push("");
  }

  // Stale
  if (analysis.stale.length > 0) {
    lines.push(`STALE ENTRIES (>${analysis.stale[0] ? "" : ""}30 days, unreferenced):`);
    for (const s of analysis.stale) {
      lines.push(`  ${s.file} line ${s.line} — [${s.date}] "${s.text}"`);
    }
    lines.push(`  ⤷ Suggest: archive or remove if no longer relevant`);
    lines.push("");
  }

  // Structural
  if (analysis.structural.length > 0) {
    lines.push("STRUCTURAL ISSUES:");
    for (const s of analysis.structural) {
      lines.push(`  ${s.file} — ${s.issue}`);
    }
    lines.push("");
  }

  if (analysis.issueCount === 0) {
    lines.push("No issues found.");
    lines.push("");
  }

  lines.push(`Memory health: ${analysis.health} (${analysis.issueCount} issues)`);
  lines.push("");

  // Instructions
  lines.push("═══ INSTRUCTIONS ═══");
  lines.push("To act on suggestions:");
  lines.push('  amem write memory/<file>.md "<cleaned content>"');
  lines.push('  amem commit "defrag: reorganized memory files"');
  lines.push("");
  lines.push("Or run a full reflect cycle to address holistically:");
  lines.push("  amem reflect gather --deep");

  return lines.join("\n");
}

/**
 * Apply non-destructive stale markers to flagged entries.
 * Returns count of entries marked.
 */
export function applyStaleMarkers(ctxDir, staleEntries) {
  if (!staleEntries.length) return 0;

  const today = new Date().toISOString().slice(0, 10);
  let marked = 0;

  // Group by file
  const byFile = {};
  for (const entry of staleEntries) {
    if (!byFile[entry.file]) byFile[entry.file] = [];
    byFile[entry.file].push(entry);
  }

  for (const [file, entries] of Object.entries(byFile)) {
    let content = readContextFile(ctxDir, file);
    if (!content) continue;

    const lines = content.split("\n");
    // Process in reverse order so line numbers stay valid
    const lineNums = entries.map((e) => e.line).sort((a, b) => b - a);

    for (const lineNum of lineNums) {
      const idx = lineNum - 1;
      if (idx >= 0 && idx < lines.length && !lines[idx].includes("[STALE]")) {
        // Insert stale marker after the entry line
        lines.splice(idx + 1, 0, `- [${today} STALE] ^^^ flagged by reflection — may be outdated`);
        marked++;
      }
    }

    writeContextFile(ctxDir, file, lines.join("\n"));
  }

  return marked;
}
