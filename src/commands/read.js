import { contextDir as getContextDir } from "../core/context-root.js";
import { readContextFile } from "../core/fs.js";
import { readConfig } from "../core/config.js";

export default async function read({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  if (!args.length) {
    console.error("❌ Usage: agent-context read <path>");
    console.error("Example: agent-context read memory/decisions.md");
    process.exit(1);
  }

  const relPath = args[0];
  const config = readConfig(ctxDir);
  const branch = config.branch || "main";

  // When on a branch and reading memory/, try branch-local first
  let content = null;
  if (branch !== "main" && relPath.startsWith("memory/")) {
    const branchPath = relPath.replace(/^memory\//, `branches/${branch}/memory/`);
    content = readContextFile(ctxDir, branchPath);
    if (content !== null) {
      console.log(`(reading from branch: ${branch})\n`);
    }
  }

  // Fall back to the exact path requested
  if (content === null) {
    content = readContextFile(ctxDir, relPath);
  }

  if (content === null) {
    console.error(`❌ File not found: .context/${relPath}`);
    process.exit(1);
  }

  console.log(content);
}
