import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { contextDir as getContextDir } from "../core/context-root.js";
import { buildTree, readContextFile } from "../core/fs.js";
import { readConfig } from "../core/config.js";

const TARGETS = {
  claude: { file: "CLAUDE.md", description: "Claude Code" },
  gemini: { file: "GEMINI.md", description: "Gemini CLI" },
  codex: { file: "AGENTS.md", description: "Codex" },
  cursor: { dir: ".cursor/rules", description: "Cursor" },
  windsurf: { file: ".windsurfrules", dir: ".windsurf/rules", description: "Windsurf" },
};

export default async function sync({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);
  const config = readConfig(ctxDir);

  // Determine targets
  let targets = [];

  if (flags.all) {
    targets = Object.keys(TARGETS);
  } else {
    for (const key of Object.keys(TARGETS)) {
      if (flags[key]) targets.push(key);
    }
  }

  // Auto-detect if no flags: sync to whatever already exists in the project
  if (!targets.length) {
    for (const [key, target] of Object.entries(TARGETS)) {
      const fileExists = target.file && existsSync(join(root, target.file));
      const dirExists = target.dir && existsSync(join(root, target.dir));
      if (fileExists || dirExists) targets.push(key);
    }
    if (!targets.length) {
      console.log("ℹ️  No sync targets detected. Use flags to specify:");
      console.log("  agent-mem sync --claude     → CLAUDE.md");
      console.log("  agent-mem sync --gemini     → GEMINI.md");
      console.log("  agent-mem sync --codex      → AGENTS.md");
      console.log("  agent-mem sync --cursor     → .cursor/rules/");
      console.log("  agent-mem sync --windsurf   → .windsurfrules");
      console.log("  agent-mem sync --all        → all of the above");
      return;
    }
    console.log(`🔍 Auto-detected targets: ${targets.map((t) => TARGETS[t].description).join(", ")}\n`);
  }

  // Gather system/ content
  const systemContent = gatherSystemContent(ctxDir);
  const memoryContent = gatherMemorySummary(ctxDir);

  for (const target of targets) {
    switch (target) {
      case "claude":
        syncSingleFile(root, "CLAUDE.md", buildClaudeMd(systemContent, memoryContent, config));
        break;
      case "gemini":
        syncSingleFile(root, "GEMINI.md", buildGeminiMd(systemContent, memoryContent, config));
        break;
      case "codex":
        syncSingleFile(root, "AGENTS.md", buildAgentsMd(systemContent, memoryContent, config));
        break;
      case "cursor":
        syncCursorRules(root, ctxDir);
        break;
      case "windsurf":
        syncWindsurf(root, ctxDir, systemContent, memoryContent);
        break;
    }
  }

  console.log(`\n✅ SYNCED .context/ → ${targets.map((t) => TARGETS[t].description).join(", ")}`);
  console.log("Tip: run after 'agent-mem commit' to keep IDE rules up to date.");
}

/**
 * Read all system/ files and return as structured content.
 */
function gatherSystemContent(ctxDir) {
  const tree = buildTree(ctxDir);
  const files = tree.filter((e) => !e.isDir && e.path.startsWith("system/"));
  const sections = [];

  for (const f of files) {
    const raw = readContextFile(ctxDir, f.path);
    if (!raw) continue;
    // Strip frontmatter
    const content = raw.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
    if (content) {
      sections.push({ name: f.name, path: f.path, content });
    }
  }

  return sections;
}

/**
 * Build a short summary of memory/ files for inclusion.
 */
function gatherMemorySummary(ctxDir) {
  const tree = buildTree(ctxDir);
  const files = tree.filter((e) => !e.isDir && e.path.startsWith("memory/"));
  if (!files.length) return "";

  const lines = ["## Key Decisions & Patterns", "", "From `.context/memory/` — run `agent-mem read <path>` for details:", ""];

  for (const f of files) {
    const raw = readContextFile(ctxDir, f.path);
    if (!raw) continue;
    // Extract entries (bullet entries or lesson headings)
    const bullets = raw.split("\n").filter((l) => l.startsWith("- [") || l.startsWith("### ["));
    if (bullets.length) {
      const lastThree = bullets.slice(-3);
      lines.push(`### ${f.name.replace(".md", "")}`);
      lines.push(...lastThree);
      if (bullets.length > 3) lines.push(`_(${bullets.length - 3} more — run \`agent-mem read ${f.path}\`)_`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ─── Shared trigger instructions ─────────────────────────────────────────────

function buildTriggerInstructions() {
  return [
    "## agent-mem — when to use",
    "",
    "**Starting this session →** `amem snapshot` (load context + memory)",
    "**You chose between alternatives →** `amem remember --decision \"chose X because Y\"`",
    "**You noticed a repeatable approach →** `amem remember --pattern \"always do X\"`",
    "**You did something wrong →** `amem remember --mistake \"never do X\"`",
    "**You solved a problem after investigation →** `amem lesson \"problem -> fix\"`",
    "**You completed meaningful work →** `amem commit \"what you did\"`",
    "**You're about to try something risky →** `amem branch name \"purpose\"`",
    "**Checking prior context →** `amem search \"query\"`",
    "",
  ].join("\n");
}

// ─── Target-specific builders ────────────────────────────────────────────────

function buildClaudeMd(systemContent, memorySummary, config) {
  const sections = [
    "# Project Context",
    "",
    "_Auto-generated by agent-mem. Edit `.context/system/` files instead._",
    "_Run `agent-mem sync --claude` to regenerate._",
    "",
  ];

  for (const s of systemContent) {
    sections.push(s.content);
    sections.push("");
  }

  if (memorySummary) {
    sections.push(memorySummary);
  }

  sections.push(buildTriggerInstructions());

  return sections.join("\n");
}

function buildGeminiMd(systemContent, memorySummary, config) {
  const sections = [
    "# Project Context",
    "",
    "_Auto-generated by agent-mem. Edit `.context/system/` files instead._",
    "_Run `agent-mem sync --gemini` to regenerate._",
    "",
  ];

  for (const s of systemContent) {
    sections.push(s.content);
    sections.push("");
  }

  if (memorySummary) {
    sections.push(memorySummary);
  }

  sections.push(buildTriggerInstructions());

  return sections.join("\n");
}

function buildAgentsMd(systemContent, memorySummary, config) {
  const sections = [
    "# AGENTS.md",
    "",
    "_Auto-generated by agent-mem. Edit `.context/system/` files instead._",
    "_Run `agent-mem sync --codex` to regenerate._",
    "",
  ];

  for (const s of systemContent) {
    sections.push(s.content);
    sections.push("");
  }

  if (memorySummary) {
    sections.push(memorySummary);
  }

  sections.push(buildTriggerInstructions());

  return sections.join("\n");
}

/**
 * Sync to Cursor: each system/ file becomes a .cursor/rules/ file.
 * Cursor reads .cursor/rules/*.md with frontmatter.
 */
function syncCursorRules(root, ctxDir) {
  const rulesDir = join(root, ".cursor", "rules");
  mkdirSync(rulesDir, { recursive: true });

  const tree = buildTree(ctxDir);
  const files = tree.filter((e) => !e.isDir && e.path.startsWith("system/"));

  for (const f of files) {
    const raw = readContextFile(ctxDir, f.path);
    if (!raw) continue;

    // Cursor rules use frontmatter with description and globs
    const content = raw.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
    const ruleName = f.name.replace(".md", "");

    const cursorRule = [
      "---",
      `description: "Project ${ruleName} (from agent-mem)"`,
      "globs: **/*",
      "alwaysApply: true",
      "---",
      "",
      `_Auto-generated by agent-mem from .context/${f.path}_`,
      "",
      content,
      "",
    ].join("\n");

    writeFileSync(join(rulesDir, `amem-${f.name}`), cursorRule);
  }

  // Write trigger instructions as a separate rule file
  const triggerRule = [
    "---",
    'description: "agent-mem trigger instructions"',
    "globs: **/*",
    "alwaysApply: true",
    "---",
    "",
    "_Auto-generated by agent-mem._",
    "",
    buildTriggerInstructions(),
  ].join("\n");

  writeFileSync(join(rulesDir, "amem-triggers.md"), triggerRule);

  console.log(`  📁 Cursor: ${files.length + 1} rules → .cursor/rules/amem-*.md`);
}

/**
 * Sync to Windsurf: .windsurfrules (single file) + .windsurf/rules/*.md
 */
function syncWindsurf(root, ctxDir, systemContent, memorySummary) {
  // Single file version
  const sections = [
    "# Project Rules",
    "",
    "_Auto-generated by agent-mem. Edit `.context/system/` files instead._",
    "",
  ];

  for (const s of systemContent) {
    sections.push(s.content);
    sections.push("");
  }

  if (memorySummary) sections.push(memorySummary);

  sections.push(buildTriggerInstructions());

  writeFileSync(join(root, ".windsurfrules"), sections.join("\n"));
  console.log(`  📄 Windsurf: .windsurfrules updated`);

  // Also write individual rule files if .windsurf/rules/ exists or --windsurf explicit
  const rulesDir = join(root, ".windsurf", "rules");
  mkdirSync(rulesDir, { recursive: true });

  const tree = buildTree(ctxDir);
  const files = tree.filter((e) => !e.isDir && e.path.startsWith("system/"));

  for (const f of files) {
    const raw = readContextFile(ctxDir, f.path);
    if (!raw) continue;
    const content = raw.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();

    writeFileSync(join(rulesDir, `amem-${f.name}`), [
      `_Auto-generated by agent-mem from .context/${f.path}_`,
      "",
      content,
      "",
    ].join("\n"));
  }

  console.log(`  📁 Windsurf: ${files.length} rules → .windsurf/rules/amem-*.md`);
}

/**
 * Write a single file to project root.
 */
function syncSingleFile(root, filename, content) {
  writeFileSync(join(root, filename), content);
  console.log(`  📄 ${filename} updated (${content.length} chars)`);
}
