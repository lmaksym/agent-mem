import { contextDir as getContextDir } from "../core/context-root.js";
import { readContextFile } from "../core/fs.js";

export default async function read({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  if (!args.length) {
    console.error("❌ Usage: agent-context read <path>");
    console.error("Example: agent-context read memory/decisions.md");
    process.exit(1);
  }

  const relPath = args[0];
  const content = readContextFile(ctxDir, relPath);

  if (content === null) {
    console.error(`❌ File not found: .context/${relPath}`);
    process.exit(1);
  }

  console.log(content);
}
