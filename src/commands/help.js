export default async function help() {
  console.log(`
agent-mem — Context management CLI for AI coding agents

USAGE
  agent-mem <command> [args] [flags]
  amem <command> [args] [flags]

CORE
  init [--from-claude] [--from-codex]   Bootstrap context + auto-sync IDE rules
  snapshot                               Context tree (agent's primary view)
  read <path>                            Read a context file
  write <path> [--content <text>]        Write/update a context file (reads stdin if no --content)
  commit [message]                       Checkpoint: summarize + git commit
  status                                 Quick status overview

MEMORY
  remember [--decision|--pattern|--mistake|--note] <text>
                                         Add to memory (structured categories)
  lesson <title> --problem <text> --resolution <text> [--tags <tags>]
                                         Record a lesson learned (problem/resolution pair)
                                         Shorthand: lesson "problem -> resolution"
  search <query>                         Search across all context files
  pin <path>                             Move file to system/ (always in context)
  unpin <path>                           Move file out of system/
  forget <path>                          Remove a memory file (archived first)

BRANCHES
  branch <name> [purpose]                Create exploration branch
  switch <name>                          Switch active branch
  merge <name> [summary]                 Merge branch back to main
  branches                               List all branches
  diff <branch>                          Compare branch context with main

COMPACTION
  compact                                Archive stale context, keep pins + recent
  compact --dry-run                      Preview what would be archived
  compact --hard                         Pins only, archive everything else

CONFLICTS
  resolve                                Auto-resolve .context/ merge conflicts
  resolve --dry-run                      Preview resolution strategy per file

REFLECTION
  reflect                                Gather reflection input (default: gather)
  reflect gather [--since <ref>] [--deep] [--compaction]
                                         Collect recent activity for reflection
  reflect save [--content <text>]        Save agent's reflection output
  reflect history [--last <n>]           Show past reflections
  reflect defrag [--dry-run]             Analyze memory health

SYNC
  sync [--claude|--gemini|--codex|--cursor|--windsurf|--all]
                                         Export .context/ to IDE rule files
                                         Auto-detects existing files if no flags

SHARING
  track [--enable|--disable]             Toggle .context/ in project git
  push [--remote <url>]                  Push .context/ to its own remote
  pull [--remote <url>]                  Pull/clone .context/ from remote
  share [--output <path>]               Generate portable snapshot file
  import <file>                          Import a shared snapshot

CONFIG
  config                                 Show current config
  config set <key> <value>               Update config value

FLAGS
  --verbose                              Show detailed output
  --help, -h                             Show this help

EXAMPLES
  agent-mem init
  agent-mem snapshot
  agent-mem commit "implemented auth flow"
  agent-mem branch try-qdrant "evaluate vector search"
  agent-mem remember --decision "chose Qdrant over Pinecone"
  agent-mem remember --pattern "always check Grafana before fixing"
  agent-mem remember --mistake "never force-push fix branches"
  agent-mem lesson "API 429 -> implement exponential backoff"
  agent-mem lesson "OOM fix" --problem "Memory leak after 1hr" --resolution "Close DB connections"
  agent-mem search "authentication"
  agent-mem reflect
  agent-mem reflect save --content "## Patterns Identified..."
  agent-mem reflect history
  agent-mem reflect defrag --dry-run
  agent-mem compact --dry-run         # preview compaction
  agent-mem compact                  # archive stale, keep recent + pins
  agent-mem compact --hard           # nuclear: pins only
  agent-mem sync                     # auto-detect IDE files
  agent-mem sync --claude            # export to CLAUDE.md
  agent-mem sync --all               # export to all IDE formats

MORE INFO
  https://github.com/lmaksym/agent-mem
`.trim());
}
