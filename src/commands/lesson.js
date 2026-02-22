import { contextDir as getContextDir } from "../core/context-root.js";
import { readContextFile, writeContextFile } from "../core/fs.js";
import { readConfig } from "../core/config.js";

const LESSON_FILE = "memory/lessons.md";
const LESSON_TITLE = "Lessons Learned";
const LESSON_DESC = "Lessons learned — problem/resolution pairs";

/**
 * Resolve memory file path based on active branch.
 * On main: memory/lessons.md
 * On branch: branches/<name>/memory/lessons.md
 */
function resolvePath(target, branch) {
  if (branch && branch !== "main") {
    return target.replace(/^memory\//, `branches/${branch}/memory/`);
  }
  return target;
}

export default async function lesson({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  if (!args.length && !flags.problem) {
    console.error("❌ Usage: agent-mem lesson <title> --problem <text> --resolution <text> [--tags <tags>]");
    console.error("");
    console.error("Or use shorthand with -> separator:");
    console.error('  agent-mem lesson "Hit 429 rate limit -> implement exponential backoff"');
    console.error("");
    console.error("Examples:");
    console.error('  agent-mem lesson "API backoff" --problem "Hit 429 on rapid calls" --resolution "Added exponential backoff"');
    console.error('  agent-mem lesson "VAD fix -> Lower threshold to 0.3" --tags "voice, audio"');
    process.exit(1);
  }

  const config = readConfig(ctxDir);
  const branch = config.branch || "main";
  const target = resolvePath(LESSON_FILE, branch);
  const text = args.join(" ");
  const date = new Date().toISOString().slice(0, 10);
  const time = new Date().toISOString().slice(11, 16);

  let title, problem, resolution, tags;

  if (flags.problem && flags.resolution) {
    title = text || flags.problem;
    problem = typeof flags.problem === "string" ? flags.problem : "";
    resolution = typeof flags.resolution === "string" ? flags.resolution : "";
    tags = typeof flags.tags === "string" ? flags.tags : null;
  } else if (text.includes("->")) {
    const sepIdx = text.indexOf("->");
    const before = text.slice(0, sepIdx).trim();
    const after = text.slice(sepIdx + 2).trim();
    if (!before || !after) {
      console.error("❌ Both sides of -> must have content.");
      console.error('  Example: "Hit 429 rate limit -> implement exponential backoff"');
      process.exit(1);
    }
    title = text.replace("->", "—");
    problem = before;
    resolution = after;
    tags = typeof flags.tags === "string" ? flags.tags : null;
  } else {
    console.error("❌ Lessons need a problem and resolution.");
    console.error("  Use --problem and --resolution flags, or -> shorthand:");
    console.error('  agent-mem lesson "problem -> resolution"');
    process.exit(1);
  }

  // Build lesson block
  let block = `\n### [${date} ${time}] ${title}\n`;
  block += `**Problem:** ${problem}\n`;
  block += `**Resolution:** ${resolution}\n`;
  if (tags) block += `**Tags:** ${tags}\n`;

  let existing = readContextFile(ctxDir, target) || [
    "---",
    `description: "${LESSON_DESC}"`,
    "---",
    "",
    `# ${LESSON_TITLE}`,
    "",
  ].join("\n");

  existing += block;

  writeContextFile(ctxDir, target, existing);
  const branchLabel = branch !== "main" ? ` [branch: ${branch}]` : "";
  console.log(`✅ LESSON${branchLabel} → .context/${target}`);
  console.log(`  "${title}"`);

  // Auto-commit if enabled
  const { maybeAutoCommit } = await import("../core/auto-commit.js");
  maybeAutoCommit(ctxDir, "lesson learned");
}
