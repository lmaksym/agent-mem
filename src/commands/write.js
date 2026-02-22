import { contextDir as getContextDir } from "../core/context-root.js";
import { writeContextFile, readContextFile } from "../core/fs.js";

export default async function write({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  if (!args.length) {
    console.error("❌ Usage: agent-context write <path> --content <text>");
    console.error("  Or pipe: echo 'content' | agent-context write <path>");
    process.exit(1);
  }

  const relPath = args[0];
  let content = flags.content;

  // If --content not provided, read from stdin
  if (!content) {
    // Remaining args as content
    if (args.length > 1) {
      content = args.slice(1).join(" ");
    } else {
      // Try stdin
      content = await readStdin();
    }
  }

  if (!content) {
    console.error("❌ No content provided. Use --content or pipe stdin.");
    process.exit(1);
  }

  const existed = readContextFile(ctxDir, relPath) !== null;
  writeContextFile(ctxDir, relPath, content);

  console.log(`✅ ${existed ? "UPDATED" : "CREATED"}: .context/${relPath} (${content.length} chars)`);
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve(null);
      return;
    }
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data || null));
    // Timeout after 100ms if no data
    setTimeout(() => resolve(data || null), 100);
  });
}
