#!/usr/bin/env node

/**
 * agent-mem — Context management CLI for AI coding agents
 *
 * Usage:
 *   agent-mem init          Bootstrap context from codebase
 *   agent-mem snapshot      Get context tree (agent's primary view)
 *   agent-mem read <path>   Read a specific context file
 *   agent-mem write <path>  Write/update a context file
 *   agent-mem commit [msg]  Checkpoint progress
 *   agent-mem status        Quick status overview
 *   agent-mem remember      Quick-add to memory
 *   agent-mem search        Search across context
 *   agent-mem branch        Create exploration branch
 *   agent-mem switch        Switch active branch
 *   agent-mem merge         Merge branch back
 *   agent-mem branches      List branches
 *   agent-mem pin           Move file to system/ (always loaded)
 *   agent-mem unpin         Move file out of system/
 *   agent-mem config        Show/set configuration
 *   agent-mem help          Show help
 */

import { resolve } from 'node:path';
import { parseArgs } from './parse-args.js';
import { findContextRoot } from '../src/core/context-root.js';

const COMMANDS = {
  init: () => import('../src/commands/init.js'),
  snapshot: () => import('../src/commands/snapshot.js'),
  read: () => import('../src/commands/read.js'),
  write: () => import('../src/commands/write.js'),
  commit: () => import('../src/commands/commit.js'),
  status: () => import('../src/commands/status.js'),
  remember: () => import('../src/commands/remember.js'),
  search: () => import('../src/commands/search.js'),
  branch: () => import('../src/commands/branch.js'),
  switch: () => import('../src/commands/switch.js'),
  merge: () => import('../src/commands/merge.js'),
  branches: () => import('../src/commands/branches.js'),
  pin: () => import('../src/commands/pin.js'),
  unpin: () => import('../src/commands/unpin.js'),
  reflect: () => import('../src/commands/reflect.js'),
  compact: () => import('../src/commands/compact.js'),
  resolve: () => import('../src/commands/resolve.js'),
  diff: () => import('../src/commands/diff.js'),
  forget: () => import('../src/commands/forget.js'),
  lesson: () => import('../src/commands/lesson.js'),
  sync: () => import('../src/commands/sync.js'),
  track: () => import('../src/commands/track.js'),
  push: () => import('../src/commands/push.js'),
  pull: () => import('../src/commands/pull.js'),
  share: () => import('../src/commands/share.js'),
  import: () => import('../src/commands/import.js'),
  config: () => import('../src/commands/config.js'),
  help: () => import('../src/commands/help.js'),
};

async function main() {
  const { command, args, flags } = parseArgs(process.argv.slice(2));

  if (!command || command === 'help' || flags.help || flags.h) {
    const mod = await COMMANDS.help();
    await mod.default({ args, flags });
    process.exit(0);
  }

  if (!(command in COMMANDS)) {
    console.error(`❌ Unknown command: ${command}`);
    console.error(`Run 'agent-mem help' for available commands.`);
    process.exit(1);
  }

  // All commands except init, help, pull, import require an existing .context/
  if (!['init', 'help', 'pull', 'import'].includes(command)) {
    const root = findContextRoot(process.cwd());
    if (!root) {
      console.error(`❌ No .context/ found. Run 'agent-mem init' first.`);
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
