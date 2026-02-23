import { contextDir as getContextDir } from '../core/context-root.js';
import { readContextFile, writeContextFile } from '../core/fs.js';
import { readConfig } from '../core/config.js';

const CATEGORIES = {
  decision: {
    file: 'memory/decisions.md',
    title: 'Decisions',
    desc: 'Architectural decisions and rationale',
  },
  pattern: {
    file: 'memory/patterns.md',
    title: 'Patterns',
    desc: 'Learned patterns and best practices',
  },
  mistake: {
    file: 'memory/mistakes.md',
    title: 'Mistakes',
    desc: 'Anti-patterns and things to avoid',
  },
  note: { file: 'memory/notes.md', title: 'Notes', desc: 'Quick notes and observations' },
};

/**
 * Resolve memory file path based on active branch.
 * On main: memory/notes.md
 * On branch: branches/<name>/memory/notes.md
 */
function resolvePath(target, branch) {
  if (branch && branch !== 'main') {
    return target.replace(/^memory\//, `branches/${branch}/memory/`);
  }
  return target;
}

export default async function remember({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  if (!args.length) {
    console.error('❌ Usage: agent-mem remember [--category] <text>');
    console.error('');
    console.error('Categories:');
    console.error('  --decision  "Chose Qdrant over Pinecone because self-hosted"');
    console.error('  --pattern   "Always check Grafana logs before fixing bugs"');
    console.error('  --mistake   "Never force-push to fix branches"');
    console.error('  --note      "Meeting with team re: auth refactor" (default)');
    console.error('');
    console.error('Or specify file directly:');
    console.error('  --file memory/custom.md "some text"');
    process.exit(1);
  }

  // Determine category from flags
  let category = 'note';
  for (const cat of Object.keys(CATEGORIES)) {
    if (flags[cat] !== undefined) {
      category = cat;
      // Flag parser may consume the next arg as value — restore it
      if (typeof flags[cat] === 'string') {
        args.unshift(flags[cat]);
      }
      break;
    }
  }

  if (!args.length) {
    console.error(`❌ No text provided. Usage: agent-mem remember --${category} "your text"`);
    process.exit(1);
  }

  const config = readConfig(ctxDir);
  const branch = config.branch || 'main';
  const baseTarget = flags.file || CATEGORIES[category].file;
  const target = resolvePath(baseTarget, branch);
  const { title, desc } = CATEGORIES[category] || CATEGORIES.note;
  const text = args.join(' ');
  const date = new Date().toISOString().slice(0, 10);
  const time = new Date().toISOString().slice(11, 16);

  let existing =
    readContextFile(ctxDir, target) ||
    ['---', `description: "${desc}"`, '---', '', `# ${title}`, ''].join('\n');

  existing += `\n- [${date} ${time}] ${text}`;

  writeContextFile(ctxDir, target, existing);
  const branchLabel = branch !== 'main' ? ` [branch: ${branch}]` : '';
  console.log(`✅ REMEMBERED (${category})${branchLabel} → .context/${target}`);
  console.log(`  "${text}"`);

  // Auto-commit if enabled
  const { maybeAutoCommit } = await import('../core/auto-commit.js');
  maybeAutoCommit(ctxDir, `remember ${category}`);
}
