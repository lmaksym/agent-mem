import { existsSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { createHash } from "node:crypto";
import { contextDir as getContextDir } from "../core/context-root.js";
import { buildTree, readContextFile } from "../core/fs.js";
import { readConfig } from "../core/config.js";
import { commitCount, lastCommit } from "../core/git.js";

/**
 * Generate a portable context snapshot that can be shared with anyone.
 * 
 * agent-context share                    — generate snapshot file
 * agent-context share --output <path>    — custom output path
 * agent-context import <file-or-url>     — import a shared snapshot
 */
export default async function share({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  const config = readConfig(ctxDir);
  const projectName = basename(root);
  const commits = commitCount(ctxDir);
  const last = lastCommit(ctxDir);

  // Gather all context into a single portable object
  const tree = buildTree(ctxDir);
  const files = {};

  for (const entry of tree) {
    if (entry.isDir) continue;
    const content = readContextFile(ctxDir, entry.path);
    if (content !== null) {
      files[entry.path] = content;
    }
  }

  const snapshot = {
    version: 1,
    tool: "agent-context",
    project: projectName,
    branch: config.branch || "main",
    commits,
    lastCommit: last,
    createdAt: new Date().toISOString(),
    files,
  };

  const json = JSON.stringify(snapshot, null, 2);
  const hash = createHash("sha256").update(json).digest("hex").slice(0, 8);
  const filename = `context-${projectName}-${hash}.json`;

  const outputPath = flags.output || join(root, filename);
  writeFileSync(outputPath, json);

  const fileCount = Object.keys(files).length;
  const sizeKb = (Buffer.byteLength(json) / 1024).toFixed(1);

  console.log(`✅ SHARED: ${filename}`);
  console.log(`  Project: ${projectName}`);
  console.log(`  Files: ${fileCount} | Size: ${sizeKb} KB | Commits: ${commits}`);
  console.log(`  Path: ${outputPath}`);
  console.log("");
  console.log("To import on another machine:");
  console.log(`  agent-context import ${filename}`);
}
