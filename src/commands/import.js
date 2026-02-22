import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { writeContextFile } from "../core/fs.js";
import { initGit, commitContext } from "../core/git.js";

/**
 * Import a shared context snapshot.
 * 
 * agent-context import <file>            — import from snapshot file
 * agent-context import --merge           — merge into existing context (default: overwrite)
 */
export default async function importCmd({ args, flags }) {
  if (!args.length) {
    console.error("❌ Usage: agent-context import <snapshot-file>");
    console.error("Example: agent-context import context-myproject-a1b2c3d4.json");
    process.exit(1);
  }

  const filePath = args[0];

  if (!existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  let snapshot;
  try {
    snapshot = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error(`❌ Invalid snapshot file: ${err.message}`);
    process.exit(1);
  }

  if (!snapshot.files || snapshot.version !== 1) {
    console.error("❌ Unrecognized snapshot format.");
    process.exit(1);
  }

  const cwd = process.cwd();
  const ctxDir = join(cwd, ".context");
  const isNew = !existsSync(ctxDir);

  mkdirSync(ctxDir, { recursive: true });

  // Write all files from snapshot
  let written = 0;
  let skipped = 0;

  for (const [path, content] of Object.entries(snapshot.files)) {
    if (!flags.merge) {
      // Overwrite mode
      writeContextFile(ctxDir, path, content);
      written++;
    } else {
      // Merge mode — only write if file doesn't exist
      const existing = join(ctxDir, path);
      if (!existsSync(existing)) {
        writeContextFile(ctxDir, path, content);
        written++;
      } else {
        skipped++;
      }
    }
  }

  // Initialize git if new
  if (isNew) {
    initGit(ctxDir);
  }

  commitContext(ctxDir, `import: from ${snapshot.project || "unknown"} (${snapshot.createdAt?.slice(0, 10) || "?"})`);

  console.log(`✅ IMPORTED: ${snapshot.project || "unknown"}`);
  console.log(`  Files written: ${written}${skipped ? ` | Skipped (existing): ${skipped}` : ""}`);
  console.log(`  Source: ${snapshot.commits || "?"} commits, created ${snapshot.createdAt?.slice(0, 10) || "?"}`);
  console.log("");
  console.log("Run: agent-context snapshot");
}
