import { contextDir as getContextDir } from "../core/context-root.js";
import { readContextFile, writeContextFile } from "../core/fs.js";
import { readConfig, writeConfig } from "../core/config.js";
import { existsSync } from "node:fs";
import { join } from "node:path";

export default async function merge({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  if (!args.length) {
    console.error("❌ Usage: agent-context merge <branch-name> [summary]");
    process.exit(1);
  }

  const name = args[0];
  const summary = args.slice(1).join(" ") || "";
  const branchDir = join(ctxDir, "branches", name);

  if (!existsSync(branchDir)) {
    console.error(`❌ Branch "${name}" not found.`);
    process.exit(1);
  }

  // Read branch files
  const purpose = readContextFile(ctxDir, `branches/${name}/purpose.md`) || "";
  const commits = readContextFile(ctxDir, `branches/${name}/commits.md`) || "";
  const trace = readContextFile(ctxDir, `branches/${name}/trace.md`) || "";

  // Append to memory/decisions.md
  const date = new Date().toISOString().slice(0, 10);
  const decisionEntry = [
    `\n## [${date}] Merged branch: ${name}`,
    "",
    purpose.trim() ? `### Purpose\n${purpose.replace(/^#.*\n/, "").trim()}` : "",
    summary ? `### Summary\n${summary}` : "",
    commits.trim() ? `### Commits\n${commits.replace(/^#.*\n/, "").trim()}` : "",
    "",
  ].filter(Boolean).join("\n");

  let decisions = readContextFile(ctxDir, "memory/decisions.md") || [
    "---",
    'description: "Architectural decisions and branch merge outcomes"',
    "---",
    "",
    "# Decisions",
    "",
  ].join("\n");

  decisions += decisionEntry;
  writeContextFile(ctxDir, "memory/decisions.md", decisions);

  // Switch back to main
  const config = readConfig(ctxDir);
  config.branch = "main";
  writeConfig(ctxDir, config);

  console.log(`✅ MERGED: ${name} → main`);
  if (summary) console.log(`Summary: ${summary}`);
  console.log(`Branch findings saved to memory/decisions.md`);
  console.log(`Switched to: main`);
  console.log(`\nNote: branch files preserved at branches/${name}/ for reference.`);
}
