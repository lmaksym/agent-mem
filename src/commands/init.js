import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, cpSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { writeContextFile, readContextFile } from "../core/fs.js";
import { writeConfig } from "../core/config.js";
import { initGit, commitContext } from "../core/git.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = join(__dirname, "..", "..");

export default async function init({ args, flags }) {
  const cwd = process.cwd();
  const contextDir = join(cwd, ".context");

  if (existsSync(contextDir) && !flags.force) {
    console.log(`⚠️  .context/ already exists. Use --force to reinitialize.`);
    return;
  }

  console.log(`🔍 Scanning project...`);

  // Detect project info
  const projectName = basename(cwd);
  const projectInfo = detectProject(cwd);

  // Create directory structure
  mkdirSync(join(contextDir, "system", "humans"), { recursive: true });
  mkdirSync(join(contextDir, "memory"), { recursive: true });
  mkdirSync(join(contextDir, "branches"), { recursive: true });
  mkdirSync(join(contextDir, "reflections"), { recursive: true });

  // Generate main.md
  writeContextFile(contextDir, "main.md", [
    `# ${projectName}`,
    "",
    "## Goals",
    "- [ ] Define project goals",
    "",
    "## Milestones",
    "- [ ] Define milestones",
    "",
    "## Status",
    `Initialized: ${new Date().toISOString().slice(0, 10)}`,
    "",
  ].join("\n"));

  // Generate system/project.md
  writeContextFile(contextDir, "system/project.md", [
    "---",
    `description: "${projectInfo.description || `Project: ${projectName}`}"`,
    "limit: 10000",
    "---",
    "",
    `# ${projectName}`,
    "",
    projectInfo.description ? `${projectInfo.description}\n` : "",
    projectInfo.stack ? `## Stack\n${projectInfo.stack}\n` : "",
    projectInfo.structure ? `## Structure\n${projectInfo.structure}\n` : "",
  ].join("\n"));

  // Generate system/conventions.md
  writeContextFile(contextDir, "system/conventions.md", [
    "---",
    'description: "Coding conventions and style rules"',
    "limit: 5000",
    "---",
    "",
    "# Conventions",
    "",
    "Add project-specific coding conventions here.",
    "",
  ].join("\n"));

  // Import from CLAUDE.md if it exists
  if (flags["from-claude"] || existsSync(join(cwd, "CLAUDE.md"))) {
    importClaudeMd(cwd, contextDir);
  }

  // Import session histories
  if (flags["from-claude"]) {
    const { importClaudeHistory } = await import("../core/importers.js");
    importClaudeHistory(cwd, contextDir);
  }

  if (flags["from-codex"]) {
    const { importCodexHistory } = await import("../core/importers.js");
    importCodexHistory(cwd, contextDir);
  }

  // Write default config
  writeConfig(contextDir, {
    auto_commit: false,
    auto_commit_interval: 10,
    reflection: {
      trigger: "manual",
      frequency: 5,
      model: null,
    },
    system_files_max: 10,
    memory_files_max: 25,
    branch: "main",
  });

  // Install agent skill to detected IDE directories
  const installedSkills = installSkills(cwd);

  // Initialize git
  initGit(contextDir);
  const hash = commitContext(contextDir, "init: bootstrap context");

  // Output
  const systemFiles = readdirSync(join(contextDir, "system")).filter(f => !f.startsWith("."));
  console.log(`
✅ INITIALIZED: .context/
Project: ${projectName}
${projectInfo.stack ? `Stack: ${projectInfo.stack.split("\n")[0]}` : ""}

Files created:
  main.md — project roadmap
  system/project.md — project overview
  system/conventions.md — coding conventions
  config.yaml — settings
  memory/ — learned context (empty)
  branches/ — exploration branches (empty)
${installedSkills.length ? `\nSkill installed to:\n${installedSkills.map(s => `  ${s}`).join("\n")}` : ""}
${hash ? `\nGit commit: ${hash}` : ""}

Next steps:
  agent-context snapshot    — view your context
  agent-context write system/conventions.md — add your coding rules
  agent-context commit "added conventions"  — checkpoint
`.trim());
}

/**
 * Install the agent-context skill to the 3 universal Agent Skills directories.
 * These cover ~14 of the 16 tools that support the agentskills.io standard:
 *
 *   .claude/skills/   — Claude Code, Goose, Amp, OpenCode, Cline
 *   .agents/skills/   — Codex CLI, Gemini CLI, Amp, OpenCode, Warp, Roo Code, Goose
 *   .github/skills/   — VS Code Copilot, GitHub Copilot
 */
function installSkills(cwd) {
  const sourceDir = join(PACKAGE_ROOT, ".claude", "skills", "agent-context");
  if (!existsSync(sourceDir)) return [];

  const targets = [
    ".claude/skills/agent-context",
    ".agents/skills/agent-context",
    ".github/skills/agent-context",
  ];

  const installed = [];

  for (const skills of targets) {
    const targetDir = join(cwd, skills);

    try {
      cpSync(sourceDir, targetDir, { recursive: true });
      installed.push(skills);
    } catch {
      // Silent fail — permissions or other issues
    }
  }

  return installed;
}

/**
 * Detect project type, stack, and structure from common files.
 */
function detectProject(cwd) {
  const info = { description: "", stack: "", structure: "" };

  // package.json
  const pkgPath = join(cwd, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      info.description = pkg.description || "";
      const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
      const stackItems = [];

      if (deps.includes("next")) stackItems.push("Next.js");
      if (deps.includes("react")) stackItems.push("React");
      if (deps.includes("vue")) stackItems.push("Vue");
      if (deps.includes("svelte") || deps.includes("@sveltejs/kit")) stackItems.push("Svelte");
      if (deps.includes("express")) stackItems.push("Express");
      if (deps.includes("fastify")) stackItems.push("Fastify");
      if (deps.includes("typescript")) stackItems.push("TypeScript");
      if (deps.includes("tailwindcss")) stackItems.push("Tailwind CSS");
      if (deps.includes("prisma") || deps.includes("@prisma/client")) stackItems.push("Prisma");
      if (deps.includes("drizzle-orm")) stackItems.push("Drizzle");

      if (stackItems.length) info.stack = stackItems.join(", ");
    } catch {}
  }

  // pyproject.toml / requirements.txt
  if (existsSync(join(cwd, "pyproject.toml")) || existsSync(join(cwd, "requirements.txt"))) {
    const stackItems = ["Python"];
    try {
      const content = existsSync(join(cwd, "pyproject.toml"))
        ? readFileSync(join(cwd, "pyproject.toml"), "utf-8")
        : readFileSync(join(cwd, "requirements.txt"), "utf-8");

      if (content.includes("fastapi")) stackItems.push("FastAPI");
      if (content.includes("django")) stackItems.push("Django");
      if (content.includes("flask")) stackItems.push("Flask");
      if (content.includes("langchain")) stackItems.push("LangChain");
      if (content.includes("langgraph")) stackItems.push("LangGraph");
      if (content.includes("sqlalchemy") || content.includes("alembic")) stackItems.push("SQLAlchemy");

      info.stack = (info.stack ? info.stack + ", " : "") + stackItems.join(", ");
    } catch {}
  }

  // Top-level structure
  try {
    const items = readdirSync(cwd)
      .filter(n => !n.startsWith(".") && !["node_modules", "__pycache__", "venv", ".venv", "dist", "build"].includes(n))
      .slice(0, 20);
    info.structure = items.map(n => `- ${n}/`).join("\n");
  } catch {}

  return info;
}

/**
 * Import existing CLAUDE.md into context.
 */
function importClaudeMd(cwd, contextDir) {
  const claudePath = join(cwd, "CLAUDE.md");
  if (!existsSync(claudePath)) return;

  const content = readFileSync(claudePath, "utf-8");
  writeContextFile(contextDir, "memory/imported-claude-md.md", [
    "---",
    'description: "Imported from CLAUDE.md"',
    "---",
    "",
    content,
  ].join("\n"));

  console.log(`  📥 Imported CLAUDE.md → memory/imported-claude-md.md`);
}
