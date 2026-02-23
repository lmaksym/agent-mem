import { contextDir as getContextDir } from '../core/context-root.js';
import { writeContextFile, readContextFile } from '../core/fs.js';
import { readConfig, writeConfig } from '../core/config.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export default async function branch({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  if (!args.length) {
    console.error('❌ Usage: agent-mem branch <name> [purpose]');
    console.error('Example: agent-mem branch try-qdrant "evaluate vector search"');
    process.exit(1);
  }

  const name = args[0];
  const purpose = args.slice(1).join(' ') || '';
  const branchDir = join(ctxDir, 'branches', name);

  if (existsSync(branchDir)) {
    console.error(`❌ Branch "${name}" already exists.`);
    process.exit(1);
  }

  const date = new Date().toISOString().slice(0, 10);

  writeContextFile(
    ctxDir,
    `branches/${name}/purpose.md`,
    [`# Branch: ${name}`, '', purpose || 'Purpose not specified.', '', `Created: ${date}`, ''].join(
      '\n',
    ),
  );

  writeContextFile(
    ctxDir,
    `branches/${name}/commits.md`,
    [`# Commits: ${name}`, '', 'Milestone log for this branch.', ''].join('\n'),
  );

  writeContextFile(
    ctxDir,
    `branches/${name}/trace.md`,
    [`# Trace: ${name}`, '', 'Fine-grained execution log.', ''].join('\n'),
  );

  // Switch to new branch
  const config = readConfig(ctxDir);
  config.branch = name;
  writeConfig(ctxDir, config);

  console.log(`✅ BRANCHED: ${name}`);
  if (purpose) console.log(`Purpose: ${purpose}`);
  console.log(`Switched to branch: ${name}`);
  console.log(`Files: branches/${name}/{purpose,commits,trace}.md`);
}
