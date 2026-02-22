import { contextDir as getContextDir } from "../core/context-root.js";
import { moveContextFile } from "../core/fs.js";
import { existsSync } from "node:fs";
import { join, basename } from "node:path";

export default async function unpin({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  if (!args.length) {
    console.error("❌ Usage: agent-context unpin <path>");
    console.error("Example: agent-context unpin system/old-conventions.md");
    process.exit(1);
  }

  const relPath = args[0].startsWith("system/") ? args[0] : `system/${args[0]}`;
  const name = basename(relPath);
  const dest = `memory/${name}`;

  if (!existsSync(join(ctxDir, relPath))) {
    console.error(`❌ File not found: .context/${relPath}`);
    process.exit(1);
  }

  moveContextFile(ctxDir, relPath, dest);
  console.log(`📌 UNPINNED: ${relPath} → ${dest}`);
  console.log(`File moved to memory/. It will show in tree but not be auto-loaded.`);
}
