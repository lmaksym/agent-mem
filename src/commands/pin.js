import { contextDir as getContextDir } from "../core/context-root.js";
import { moveContextFile, readContextFile } from "../core/fs.js";
import { existsSync } from "node:fs";
import { join, basename } from "node:path";

export default async function pin({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  if (!args.length) {
    console.error("❌ Usage: agent-context pin <path>");
    console.error("Example: agent-context pin memory/decisions.md");
    console.error("Moves the file into system/ so it's always in agent context.");
    process.exit(1);
  }

  const relPath = args[0];
  if (relPath.startsWith("system/")) {
    console.log("ℹ️  Already pinned (in system/).");
    return;
  }

  const name = basename(relPath);
  const dest = `system/${name}`;

  if (!existsSync(join(ctxDir, relPath))) {
    console.error(`❌ File not found: .context/${relPath}`);
    process.exit(1);
  }

  moveContextFile(ctxDir, relPath, dest);
  console.log(`📌 PINNED: ${relPath} → ${dest}`);
  console.log(`This file will now always be included in agent context.`);
}
