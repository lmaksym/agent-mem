import { contextDir as getContextDir } from "../core/context-root.js";
import { readContextFile, writeContextFile, parseFrontmatter, listFiles } from "../core/fs.js";
import { readConfig } from "../core/config.js";
import { commitContext } from "../core/git.js";
import { gatherReflectionPrompt, getReflectionFiles } from "../core/reflect-gather.js";
import { parseReflection, extractGaps, extractStaleEntries, extractSummary } from "../core/reflect-parse.js";
import { analyzeDefrag, formatDefragOutput, applyStaleMarkers } from "../core/reflect-defrag.js";

const MEMORY_CATEGORIES = {
  decision: { file: "memory/decisions.md", title: "Decisions", desc: "Architectural decisions and rationale" },
  pattern: { file: "memory/patterns.md", title: "Patterns", desc: "Learned patterns and best practices" },
  mistake: { file: "memory/mistakes.md", title: "Mistakes", desc: "Anti-patterns and things to avoid" },
  note: { file: "memory/notes.md", title: "Notes", desc: "Quick notes and observations" },
  lesson: { file: "memory/lessons.md", title: "Lessons Learned", desc: "Lessons learned — problem/resolution pairs" },
};

export default async function reflect({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  // Determine subcommand
  const subcommand = args[0] || "gather";
  const subArgs = args.slice(1);

  switch (subcommand) {
    case "gather":
      return doGather(ctxDir, flags);
    case "save":
      return doSave(ctxDir, subArgs, flags);
    case "history":
      return doHistory(ctxDir, flags);
    case "defrag":
      return doDefrag(ctxDir, flags);
    default:
      // If unrecognized subcommand, treat as gather
      return doGather(ctxDir, flags);
  }
}

// ─── GATHER ──────────────────────────────────────────────────────────────

async function doGather(ctxDir, flags) {
  const result = gatherReflectionPrompt(ctxDir, flags);

  if (result.empty) {
    console.log("ℹ️  No activity since last reflection. Nothing to reflect on.");
    return;
  }

  console.log(result.prompt);
}

// ─── SAVE ────────────────────────────────────────────────────────────────

async function doSave(ctxDir, args, flags) {
  let content = flags.content;

  if (!content) {
    if (args.length > 0) {
      content = args.join(" ");
    } else {
      content = await readStdin();
    }
  }

  if (!content) {
    console.error('❌ Usage: amem reflect save --content "YOUR_REFLECTION"');
    console.error("  Or pipe: echo 'reflection' | amem reflect save");
    process.exit(1);
  }

  // Parse the reflection
  const parsed = parseReflection(content);

  if (!parsed.recognized) {
    console.log("⚠️  Could not parse structured sections. Saving as raw text.");
  }

  // Determine filename (handle multiple reflections same day)
  const today = new Date().toISOString().slice(0, 10);
  let filename = `reflections/${today}.md`;
  let counter = 1;
  while (readContextFile(ctxDir, filename) !== null) {
    counter++;
    filename = `reflections/${today}-${counter}.md`;
  }

  // Read breadcrumb state from gather phase
  let state = {};
  const stateRaw = readContextFile(ctxDir, ".reflect-state.json");
  if (stateRaw) {
    try {
      state = JSON.parse(stateRaw);
    } catch {}
  }

  // Extract actionable items (lessons can come from dedicated section or gaps)
  const extractedLessons = parsed.recognized ? extractGaps(parsed.sections.lessons) : [];
  const extractedGapsRaw = parsed.recognized ? extractGaps(parsed.sections.gaps) : [];
  const extractedGaps = [...extractedLessons, ...extractedGapsRaw];
  const staleEntries = parsed.recognized ? extractStaleEntries(parsed.sections.stale) : [];
  const summary = parsed.recognized ? extractSummary(parsed.sections) : null;

  // Build reflection file with frontmatter
  const frontmatterLines = [
    "---",
    `date: "${today}"`,
    state.window_start ? `window_start: "${state.window_start}"` : null,
    state.window_end ? `window_end: "${state.window_end}"` : null,
    state.commits_reviewed != null ? `commits_reviewed: ${state.commits_reviewed}` : null,
    state.last_commit_hash ? `last_commit_hash: "${state.last_commit_hash}"` : null,
    `entries_extracted: ${extractedGaps.length}`,
    "---",
  ].filter(Boolean);

  const body = parsed.recognized ? content : `## Raw Reflection\n\n${content}`;
  const reflectionContent = `${frontmatterLines.join("\n")}\n\n# Reflection: ${today}\n\n${body}`;
  writeContextFile(ctxDir, filename, reflectionContent);

  // Extract gaps to memory files
  const extracted = {};
  for (const gap of extractedGaps) {
    const cat = MEMORY_CATEGORIES[gap.type];
    if (!cat) continue;

    const date = new Date().toISOString().slice(0, 10);
    const time = new Date().toISOString().slice(11, 16);

    let existing =
      readContextFile(ctxDir, cat.file) ||
      ["---", `description: "${cat.desc}"`, "---", "", `# ${cat.title}`, ""].join("\n");

    if (gap.type === "lesson") {
      // Structured block format for lessons
      let block = `\n### [${date} ${time}] ${gap.text}\n`;
      block += `**Problem:** ${gap.problem || gap.text}\n`;
      block += `**Resolution:** ${gap.resolution || gap.text}\n`;
      existing += block;
    } else {
      existing += `\n- [${date} ${time}] ${gap.text}`;
    }
    writeContextFile(ctxDir, cat.file, existing);

    if (!extracted[cat.file]) extracted[cat.file] = 0;
    extracted[cat.file]++;
  }

  // Flag stale entries (non-destructive markers)
  let staleMarked = 0;
  if (staleEntries.length > 0) {
    staleMarked = applyStaleMarkers(ctxDir, staleEntries);
  }

  // Update breadcrumb state
  if (stateRaw) {
    state.saved_at = new Date().toISOString();
    state.reflection_file = filename;
    writeContextFile(ctxDir, ".reflect-state.json", JSON.stringify(state, null, 2));
  }

  // Git commit
  const commitMsg = summary ? `reflect: ${summary.slice(0, 60)}` : `reflect: ${today}`;
  const hash = commitContext(ctxDir, commitMsg);

  // Output
  console.log(`✅ REFLECTED: ${filename}`);
  if (state.window_start && state.window_end) {
    console.log(
      `Window: ${state.window_start} → ${state.window_end} (${state.commits_reviewed || "?"} commits reviewed)`
    );
  }

  if (Object.keys(extracted).length > 0) {
    console.log("Extracted:");
    for (const [file, count] of Object.entries(extracted)) {
      console.log(`  → ${file}: +${count} entr${count > 1 ? "ies" : "y"}`);
    }
  }

  if (staleMarked > 0) {
    console.log(`Flagged stale: ${staleMarked} entr${staleMarked > 1 ? "ies" : "y"}`);
  }

  if (hash) {
    console.log(`Committed: ${hash}`);
  }
}

// ─── HISTORY ─────────────────────────────────────────────────────────────

async function doHistory(ctxDir, flags) {
  const reflections = getReflectionFiles(ctxDir);
  const lastN = flags.last ? parseInt(flags.last, 10) : 5;

  if (reflections.length === 0) {
    console.log("📋 No reflections yet. Run `amem reflect` to create your first.");
    return;
  }

  const shown = reflections.slice(-lastN).reverse();
  console.log(`📋 REFLECTION HISTORY (showing ${shown.length} of ${reflections.length})`);
  console.log("");

  const allThemes = [];

  for (let i = 0; i < shown.length; i++) {
    const raw = readContextFile(ctxDir, shown[i]);
    if (!raw) continue;

    const { content: body } = parseFrontmatter(raw);

    // Parse frontmatter for metadata
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    const fm = fmMatch ? fmMatch[1] : "";
    const commits = fm.match(/commits_reviewed:\s*(\d+)/)?.[1] || "?";
    const extracted = fm.match(/entries_extracted:\s*(\d+)/)?.[1] || "0";
    const windowStart = fm.match(/window_start:\s*['"]?([^'"]+)['"]?/)?.[1] || "";
    const windowEnd = fm.match(/window_end:\s*['"]?([^'"]+)['"]?/)?.[1] || "";

    // Extract themes
    const themeMatch = body.match(/## Themes?\n([\s\S]*?)(?=\n## |\n$|$)/);
    const themes = themeMatch
      ? themeMatch[1]
          .split("\n")
          .filter((l) => l.trim().startsWith("-"))
          .map((l) => l.replace(/^-\s*/, "").trim())
      : [];
    allThemes.push(...themes);

    // Extract summary
    const summaryMatch = body.match(/## Summary\n([\s\S]*?)(?=\n## |\n$|$)/);
    const summary = summaryMatch ? summaryMatch[1].trim().slice(0, 120) : "(no summary)";

    const window = windowStart && windowEnd ? ` | Window: ${windowStart.slice(5)}–${windowEnd.slice(5)}` : "";
    const date = shown[i].replace("reflections/", "").replace(".md", "");

    console.log(`${i + 1}. ${date} — ${commits} commits | ${extracted} extracted${window}`);
    if (themes.length > 0) {
      console.log(`   Themes: ${themes.join(", ")}`);
    }
    console.log(`   Summary: ${summary}`);
    console.log("");
  }

  // Recurring themes across 3+ reflections
  if (allThemes.length > 0 && shown.length >= 3) {
    const themeCounts = {};
    for (const theme of allThemes) {
      const words = theme
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 3);
      for (const word of words) {
        themeCounts[word] = (themeCounts[word] || 0) + 1;
      }
    }

    const recurring = Object.entries(themeCounts)
      .filter(([, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (recurring.length > 0) {
      console.log("Recurring themes (3+ reflections):");
      for (const [word, count] of recurring) {
        console.log(`  - "${word}" (${count}/${shown.length})`);
      }
    }
  }
}

// ─── DEFRAG ──────────────────────────────────────────────────────────────

async function doDefrag(ctxDir, flags) {
  const isDryRun = flags["dry-run"] === true;
  const analysis = analyzeDefrag(ctxDir);

  console.log(formatDefragOutput(analysis, isDryRun));

  // If not dry run, apply stale markers
  if (!isDryRun && analysis.stale.length > 0) {
    const marked = applyStaleMarkers(ctxDir, analysis.stale);
    if (marked > 0) {
      const hash = commitContext(ctxDir, `defrag: flagged ${marked} stale entries`);
      console.log("");
      console.log(`Applied: ${marked} stale markers. Committed: ${hash}`);
    }
  }
}

// ─── UTILS ───────────────────────────────────────────────────────────────

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve(null);
      return;
    }
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data || null));
    setTimeout(() => resolve(data || null), 100);
  });
}
