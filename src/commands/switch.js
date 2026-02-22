import { contextDir as getContextDir } from "../core/context-root.js";
import { readConfig, writeConfig } from "../core/config.js";
import { existsSync } from "node:fs";
import { join } from "node:path";

export default async function switchBranch({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  if (!args.length) {
    console.error("❌ Usage: agent-mem switch <branch-name>");
    process.exit(1);
  }

  const name = args[0];

  if (name !== "main") {
    const branchDir = join(ctxDir, "branches", name);
    if (!existsSync(branchDir)) {
      console.error(`❌ Branch "${name}" not found. Run 'agent-mem branches' to see available.`);
      process.exit(1);
    }
  }

  const config = readConfig(ctxDir);
  const prev = config.branch || "main";
  config.branch = name;
  writeConfig(ctxDir, config);

  console.log(`✅ SWITCHED: ${prev} → ${name}`);
}
