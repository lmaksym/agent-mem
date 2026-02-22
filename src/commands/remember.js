import { contextDir as getContextDir } from "../core/context-root.js";
import { readContextFile, writeContextFile } from "../core/fs.js";

export default async function remember({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  if (!args.length) {
    console.error("❌ Usage: agent-context remember <text>");
    console.error('Example: agent-context remember "always check logs before fixing"');
    process.exit(1);
  }

  const text = args.join(" ");
  const date = new Date().toISOString().slice(0, 10);
  const time = new Date().toISOString().slice(11, 16);
  const target = flags.file || "memory/notes.md";

  let existing = readContextFile(ctxDir, target) || [
    "---",
    'description: "Quick notes and things to remember"',
    "---",
    "",
    "# Notes",
    "",
  ].join("\n");

  existing += `\n- [${date} ${time}] ${text}`;

  writeContextFile(ctxDir, target, existing);
  console.log(`✅ REMEMBERED → .context/${target}`);
  console.log(`  "${text}"`);
}
