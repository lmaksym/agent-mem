import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { contextDir as getContextDir } from "../core/context-root.js";
import { readContextFile } from "../core/fs.js";

/**
 * Collect all .md files recursively from a directory, returning { relPath → content }.
 */
function collectFiles(baseDir, subDir = "") {
  const files = {};
  const dir = subDir ? join(baseDir, subDir) : baseDir;
  if (!existsSync(dir)) return files;

  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    const rel = subDir ? `${subDir}/${name}` : name;
    if (statSync(full).isDirectory()) {
      Object.assign(files, collectFiles(baseDir, rel));
    } else {
      files[rel] = readFileSync(full, "utf-8");
    }
  }
  return files;
}

/**
 * Simple line-based diff between two strings.
 * Returns { added: string[], removed: string[], unchanged: number }
 */
function lineDiff(a, b) {
  const aLines = new Set((a || "").split("\n"));
  const bLines = new Set((b || "").split("\n"));
  const added = [];
  const removed = [];
  let unchanged = 0;

  for (const line of bLines) {
    if (!aLines.has(line)) added.push(line);
    else unchanged++;
  }
  for (const line of aLines) {
    if (!bLines.has(line)) removed.push(line);
  }

  return { added, removed, unchanged };
}

export default async function diff({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  const branchName = args[0];
  if (!branchName) {
    console.error("❌ Usage: agent-context diff <branch>");
    console.error("Compare a branch's context with main.");
    process.exit(1);
  }

  const branchDir = join(ctxDir, "branches", branchName);
  if (!existsSync(branchDir)) {
    console.error(`❌ Branch "${branchName}" not found.`);
    process.exit(1);
  }

  // Branch metadata files to exclude from diff (these are branch-level, not context)
  const BRANCH_METADATA = new Set(["purpose.md", "commits.md", "trace.md"]);

  // Collect branch files, excluding metadata
  const rawBranchFiles = collectFiles(branchDir);
  const branchFiles = {};
  for (const [path, content] of Object.entries(rawBranchFiles)) {
    if (!BRANCH_METADATA.has(path)) {
      branchFiles[path] = content;
    }
  }

  // Collect main-level files (memory/, system/) for comparison
  // Use same path structure as branch files for valid comparison
  const mainFiles = {};
  for (const dir of ["memory", "system"]) {
    const collected = collectFiles(join(ctxDir, dir));
    for (const [rel, content] of Object.entries(collected)) {
      mainFiles[`${dir}/${rel}`] = content;
    }
  }
  // Also include main.md
  const mainMd = readContextFile(ctxDir, "main.md");
  if (mainMd) mainFiles["main.md"] = mainMd;

  // Compute diffs
  // Branches are sparse — only compare files that exist IN the branch.
  // Files only in main are NOT "deleted" (branches don't clone main).
  const diffs = [];
  let totalAdded = 0;
  let totalRemoved = 0;

  for (const path of Object.keys(branchFiles).sort()) {
    const mainContent = path in mainFiles ? mainFiles[path] : null;
    const branchContent = branchFiles[path];

    if (mainContent === branchContent) continue; // identical

    if (mainContent === null) {
      // File exists in branch but not in main — new file
      diffs.push({ path, status: "added", lines: branchContent.split("\n").length });
      totalAdded += branchContent.split("\n").length;
    } else {
      // File exists in both — compare
      const { added, removed } = lineDiff(mainContent, branchContent);
      if (added.length || removed.length) {
        diffs.push({ path, status: "modified", added, removed });
        totalAdded += added.length;
        totalRemoved += removed.length;
      }
    }
  }

  // Output
  console.log(`🔀 DIFF: main ↔ ${branchName}`);
  console.log("");

  if (diffs.length === 0) {
    console.log("No differences found.");
    return;
  }

  for (const d of diffs) {
    if (d.status === "added") {
      console.log(`  + ${d.path} (new, ${d.lines} lines)`);
    } else if (d.status === "removed") {
      console.log(`  - ${d.path} (deleted, ${d.lines} lines)`);
    } else {
      console.log(`  ~ ${d.path} (+${d.added.length} / -${d.removed.length})`);
      if (flags.verbose) {
        for (const line of d.added.slice(0, 5)) {
          console.log(`    + ${line}`);
        }
        for (const line of d.removed.slice(0, 5)) {
          console.log(`    - ${line}`);
        }
        const moreAdded = d.added.length - 5;
        const moreRemoved = d.removed.length - 5;
        if (moreAdded > 0 || moreRemoved > 0) {
          console.log(`    ... and ${Math.max(0, moreAdded)} more added, ${Math.max(0, moreRemoved)} more removed`);
        }
      }
    }
  }

  console.log("");
  console.log(`Summary: ${diffs.length} file${diffs.length > 1 ? "s" : ""} changed, +${totalAdded} / -${totalRemoved} lines`);
}
