import { contextDir as getContextDir } from "../core/context-root.js";
import { buildTree, readContextFile } from "../core/fs.js";

export default async function search({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  if (!args.length) {
    console.error("❌ Usage: agent-context search <query>");
    process.exit(1);
  }

  const query = args.join(" ").toLowerCase();
  const tree = buildTree(ctxDir);
  const files = tree.filter((e) => !e.isDir);
  const results = [];

  for (const file of files) {
    const content = readContextFile(ctxDir, file.path);
    if (!content) continue;

    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(query)) {
        results.push({
          path: file.path,
          line: i + 1,
          text: lines[i].trim(),
        });
      }
    }
  }

  if (!results.length) {
    console.log(`🔍 SEARCH: "${args.join(" ")}"\nNo results found.`);
    return;
  }

  console.log(`🔍 SEARCH: "${args.join(" ")}" (${results.length} matches)\n`);

  // Group by file, show top 20
  const shown = results.slice(0, 20);
  for (let i = 0; i < shown.length; i++) {
    const r = shown[i];
    const preview = r.text.length > 100 ? r.text.slice(0, 97) + "..." : r.text;
    console.log(`${i + 1}. ${r.path}:${r.line} — ${preview}`);
  }

  if (results.length > 20) {
    console.log(`\n... and ${results.length - 20} more matches`);
  }
}
