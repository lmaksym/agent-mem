#!/usr/bin/env node

/**
 * agent-context — Context management CLI for AI coding agents
 *
 * Usage:
 *   agent-context init          Bootstrap context from codebase
 *   agent-context snapshot      Get context tree (agent's primary view)
 *   agent-context read <path>   Read a specific context file
 *   agent-context write <path>  Write/update a context file
 *   agent-context commit [msg]  Checkpoint progress
 *   agent-context status        Quick status overview
 *   agent-context remember      Quick-add to memory
 *   agent-context search        Search across context
 *   agent-context branch        Create exploration branch
 *   agent-context switch        Switch active branch
 *   agent-context merge         Merge branch back
 *   agent-context branches      List branches
 *   agent-context pin           Move file to system/ (always loaded)
 *   agent-context unpin         Move file out of system/
 *   agent-context config        Show/set configuration
 *   agent-context help          Show help
 */

import { resolve } from "node:path";
import { parseArgs } from "./parse-args.js";
import { findContextRoot } from "../src/core/context-root.js";

const COMMANDS = {
  init: () => import("../src/commands/init.js"),
  snapshot: () => import("../src/commands/snapshot.js"),
  read: () => import("../src/commands/read.js"),
  write: () => import("../src/commands/write.js"),
  commit: () => import("../src/commands/commit.js"),
  status: () => import("../src/commands/status.js"),
  remember: () => import("../src/commands/remember.js"),
  search: () => import("../src/commands/search.js"),
  branch: () => import("../src/commands/branch.js"),
  switch: () => import("../src/commands/switch.js"),
  merge: () => import("../src/commands/merge.js"),
  branches: () => import("../src/commands/branches.js"),
  pin: () => import("../src/commands/pin.js"),
  unpin: () => import("../src/commands/unpin.js"),
  reflect: () => import("../src/commands/reflect.js"),
  config: () => import("../src/commands/config.js"),
  help: () => import("../src/commands/help.js"),
};

async function main() {
  const { command, args, flags } = parseArgs(process.argv.slice(2));

  if (!command || command === "help" || flags.help || flags.h) {
    const mod = await COMMANDS.help();
    await mod.default({ args, flags });
    process.exit(0);
  }

  if (!(command in COMMANDS)) {
    console.error(`❌ Unknown command: ${command}`);
    console.error(`Run 'agent-context help' for available commands.`);
    process.exit(1);
  }

  // All commands except init and help require an existing .context/
  if (command !== "init" && command !== "help") {
    const root = findContextRoot(process.cwd());
    if (!root) {
      console.error(`❌ No .context/ found. Run 'agent-context init' first.`);
      process.exit(1);
    }
    flags._contextRoot = root;
  }

  try {
    const mod = await COMMANDS[command]();
    await mod.default({ args, flags });
  } catch (err) {
    console.error(`❌ ${err.message}`);
    if (flags.verbose) console.error(err.stack);
    process.exit(1);
  }
}

main();
