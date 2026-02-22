/**
 * Minimal argument parser. Zero deps.
 *
 * parseArgs(["init", "--from-claude", "--verbose"])
 * → { command: "init", args: [], flags: { "from-claude": true, verbose: true } }
 *
 * parseArgs(["read", "memory/decisions.md"])
 * → { command: "read", args: ["memory/decisions.md"], flags: {} }
 *
 * parseArgs(["commit", "implemented auth flow"])
 * → { command: "commit", args: ["implemented", "auth", "flow"], flags: {} }
 */

export function parseArgs(argv) {
  const flags = {};
  const args = [];
  let command = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (!command && !arg.startsWith("-")) {
      command = arg;
      continue;
    }

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const eqIdx = key.indexOf("=");
      if (eqIdx !== -1) {
        flags[key.slice(0, eqIdx)] = key.slice(eqIdx + 1);
      } else {
        // Boolean-only flags (never consume next arg as value)
        const BOOLEAN_FLAGS = new Set([
          "help", "h", "verbose", "force", "deep", "compare", "landscape",
          "from-claude", "from-codex", "json", "no-fetch",
          "decision", "pattern", "mistake", "note",
          "dry-run", "compaction",
        ]);
        if (BOOLEAN_FLAGS.has(key)) {
          flags[key] = true;
        } else {
          // Check if next arg is a value
          const next = argv[i + 1];
          if (next && !next.startsWith("-")) {
            flags[key] = next;
            i++;
          } else {
            flags[key] = true;
          }
        }
      }
    } else if (arg.startsWith("-") && arg.length === 2) {
      flags[arg.slice(1)] = true;
    } else {
      args.push(arg);
    }
  }

  return { command, args, flags };
}
