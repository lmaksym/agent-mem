import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { contextDir as getContextDir } from '../core/context-root.js';

/**
 * Toggle whether .context/ is tracked in the project's git repo.
 *
 * agent-mem track          — show current status
 * agent-mem track --enable — add .context/ to project git
 * agent-mem track --disable — add .context/ to .gitignore
 */
export default async function track({ args, flags }) {
  const root = flags._contextRoot;
  const gitignorePath = join(root, '.gitignore');

  const hasGitignore = existsSync(gitignorePath);
  const gitignoreContent = hasGitignore ? readFileSync(gitignorePath, 'utf-8') : '';
  const isIgnored = gitignoreContent
    .split('\n')
    .some((l) => l.trim() === '.context/' || l.trim() === '.context');

  if (flags.enable) {
    if (!isIgnored) {
      console.log('✅ .context/ is already tracked (not in .gitignore).');
      return;
    }

    // Remove .context/ from .gitignore
    const lines = gitignoreContent
      .split('\n')
      .filter((l) => l.trim() !== '.context/' && l.trim() !== '.context');
    writeFileSync(gitignorePath, lines.join('\n'));
    console.log('✅ TRACKED: .context/ removed from .gitignore');
    console.log('Context will be committed with your project code.');
    console.log("Run: git add .context/ && git commit -m 'track agent context'");
    return;
  }

  if (flags.disable) {
    if (isIgnored) {
      console.log('✅ .context/ is already ignored.');
      return;
    }

    // Add .context/ to .gitignore
    const newContent = gitignoreContent.trimEnd() + '\n\n# agent-mem (local only)\n.context/\n';
    writeFileSync(gitignorePath, newContent);
    console.log('✅ UNTRACKED: .context/ added to .gitignore');
    console.log("Context stays local — use 'agent-mem push' to sync across machines.");
    return;
  }

  // Status
  console.log(`📊 TRACKING STATUS:`);
  console.log(
    `  .context/ is ${isIgnored ? 'IGNORED (local only)' : 'TRACKED (committed with project)'}`,
  );
  console.log('');
  console.log('  agent-mem track --enable   — commit context with project');
  console.log('  agent-mem track --disable  — keep context local only');
}
