import { contextDir as getContextDir } from '../core/context-root.js';
import { listFiles, readContextFile } from '../core/fs.js';
import { readConfig } from '../core/config.js';

export default async function branches({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);
  const config = readConfig(ctxDir);
  const current = config.branch || 'main';

  const branchNames = listFiles(ctxDir, 'branches');

  console.log(`📂 BRANCHES:`);
  console.log(`  ${current === 'main' ? '* ' : '  '}main (default)`);

  if (!branchNames.length) {
    console.log('\n  No exploration branches yet.');
    console.log('  Create one: agent-mem branch <name> "purpose"');
    return;
  }

  for (const name of branchNames) {
    const purpose = readContextFile(ctxDir, `branches/${name}/purpose.md`);
    const purposeLine =
      purpose
        ?.split('\n')
        .find(
          (l) =>
            l.trim() && !l.startsWith('#') && !l.startsWith('---') && !l.startsWith('Created:'),
        ) || '';
    const marker = current === name ? '* ' : '  ';
    console.log(`  ${marker}${name} — ${purposeLine.trim() || '(no purpose)'}`);
  }
}
