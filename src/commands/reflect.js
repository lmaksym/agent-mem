import { contextDir as getContextDir } from "../core/context-root.js";
import { readContextFile, writeContextFile, buildTree } from "../core/fs.js";
import { commitContext, commitCount } from "../core/git.js";
import { readConfig } from "../core/config.js";
import { execSync } from "node:child_process";

export default async function reflect({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  console.log("🔍 REFLECTING on recent context...\n");

  // Gather recent git log from .context/
  let recentCommits = "";
  try {
    recentCommits = execSync('git log --oneline -20 --format="%s"', {
      cwd: ctxDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    recentCommits = "(no commits yet)";
  }

  // Read all memory files
  const tree = buildTree(ctxDir);
  const memoryFiles = tree.filter((e) => e.path.startsWith("memory/") && !e.isDir);
  const memories = {};
  for (const f of memoryFiles) {
    memories[f.name] = readContextFile(ctxDir, f.path) || "";
  }

  // Read branch info
  const branchFiles = tree.filter((e) => e.path.startsWith("branches/") && e.isDir && e.depth === 1);

  // Generate reflection summary
  const date = new Date().toISOString().slice(0, 10);
  const time = new Date().toISOString().slice(11, 16);

  const sections = [`# Reflection — ${date} ${time}`, ""];

  // Summarize recent activity
  sections.push("## Recent Commits");
  sections.push(recentCommits ? recentCommits.split("\n").map((l) => `- ${l}`).join("\n") : "- No recent commits");
  sections.push("");

  // Analyze memory file sizes and suggest compaction
  sections.push("## Memory Health");
  let needsCompaction = false;
  for (const [name, content] of Object.entries(memories)) {
    const lines = content.split("\n").filter((l) => l.startsWith("- [")).length;
    const status = lines > 50 ? "⚠️ LARGE" : lines > 20 ? "📋 Growing" : "✅ OK";
    if (lines > 50) needsCompaction = true;
    sections.push(`- ${name}: ${lines} entries ${status}`);
  }
  if (!Object.keys(memories).length) {
    sections.push("- No memory files yet");
  }
  sections.push("");

  if (needsCompaction) {
    sections.push("## ⚠️ Compaction Needed");
    sections.push("Some memory files have >50 entries. Consider:");
    sections.push("- Archiving old entries");
    sections.push("- Consolidating related decisions");
    sections.push("- Moving resolved items to a dated archive file");
    sections.push("");
  }

  // Branch status
  if (branchFiles.length) {
    sections.push("## Active Branches");
    for (const b of branchFiles) {
      const purpose = readContextFile(ctxDir, `${b.path}/purpose.md`);
      const purposeLine = purpose?.split("\n").find((l) => l.trim() && !l.startsWith("#") && !l.startsWith("---") && !l.startsWith("Created:")) || "";
      sections.push(`- ${b.name}: ${purposeLine.trim() || "(no purpose)"}`);
    }
    sections.push("");
  }

  // Provide the reflection prompt for the agent
  sections.push("## Reflection Prompt");
  sections.push("Review the above and consider:");
  sections.push("1. Are there patterns in recent commits that should become conventions?");
  sections.push("2. Are there repeated mistakes that should be documented?");
  sections.push("3. Are any branches stale and should be merged or abandoned?");
  sections.push("4. Is the project roadmap (main.md) still accurate?");
  sections.push("5. Should any memory files be pinned to system/ or unpinned?");
  sections.push("");

  const reflectionContent = sections.join("\n");

  // Write reflection file
  writeContextFile(ctxDir, `reflections/${date}.md`, reflectionContent);

  // Auto-commit reflection
  const hash = commitContext(ctxDir, `reflect: ${date}`);

  // Output
  console.log(reflectionContent);
  console.log("---");
  console.log(`✅ REFLECTED → .context/reflections/${date}.md`);
  if (hash) console.log(`Committed: ${hash}`);
  console.log("\nUse the reflection prompt above to update memory files.");
  console.log("Then: agent-context commit \"reflection updates\"");
}
