import { contextDir as getContextDir } from "../core/context-root.js";
import { readContextFile, writeContextFile, listFiles } from "../core/fs.js";
import { readConfig, writeConfig } from "../core/config.js";
import { existsSync } from "node:fs";
import { join } from "node:path";

export default async function merge({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  if (!args.length) {
    console.error("❌ Usage: agent-mem merge <branch-name> [summary]");
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

  // Merge branch-scoped memory into main memory
  const branchMemDir = join(ctxDir, "branches", name, "memory");
  let mergedCount = 0;
  if (existsSync(branchMemDir)) {
    const branchMemFiles = listFiles(ctxDir, `branches/${name}/memory`);
    for (const memFile of branchMemFiles) {
      if (!memFile.endsWith(".md")) continue;
      const branchContent = readContextFile(ctxDir, `branches/${name}/memory/${memFile}`);
      if (!branchContent) continue;

      // Extract entries (lines starting with "- [")
      const branchEntries = branchContent.split("\n").filter((l) => /^- \[/.test(l));
      if (!branchEntries.length) continue;

      const mainPath = `memory/${memFile}`;
      let mainContent = readContextFile(ctxDir, mainPath);

      if (!mainContent) {
        // Create the main file with branch content header
        const headerMatch = branchContent.match(/^---\n[\s\S]*?\n---\n[\s\S]*?(?=\n- \[)/);
        mainContent = headerMatch ? headerMatch[0] : `# ${memFile.replace(".md", "")}\n`;
      }

      // Deduplicate: only append entries not already in main
      const mainLines = new Set(mainContent.split("\n"));
      const newEntries = branchEntries.filter((e) => !mainLines.has(e));

      if (newEntries.length) {
        mainContent += "\n" + newEntries.join("\n");
        writeContextFile(ctxDir, mainPath, mainContent);
        mergedCount += newEntries.length;
      }
    }
  }

  // Switch back to main
  const config = readConfig(ctxDir);
  config.branch = "main";
  writeConfig(ctxDir, config);

  console.log(`✅ MERGED: ${name} → main`);
  if (summary) console.log(`Summary: ${summary}`);
  console.log(`Branch findings saved to memory/decisions.md`);
  if (mergedCount > 0) {
    console.log(`Merged ${mergedCount} branch memory entries into main memory`);
  }
  console.log(`Switched to: main`);
  console.log(`\nNote: branch files preserved at branches/${name}/ for reference.`);
}
