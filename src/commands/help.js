export default async function help() {
  console.log(`
agent-context — Context management CLI for AI coding agents

USAGE
  agent-context <command> [args] [flags]
  actx <command> [args] [flags]

CORE
  init [--from-claude] [--from-codex]   Bootstrap context from codebase
  snapshot                               Context tree (agent's primary view)
  read <path>                            Read a context file
  write <path> [--content <text>]        Write/update a context file (reads stdin if no --content)
  commit [message]                       Checkpoint: summarize + git commit
  status                                 Quick status overview

MEMORY
  remember [--decision|--pattern|--mistake|--note] <text>
                                         Add to memory (structured categories)
  search <query>                         Search across all context files
  pin <path>                             Move file to system/ (always in context)
  unpin <path>                           Move file out of system/

BRANCHES
  branch <name> [purpose]                Create exploration branch
  switch <name>                          Switch active branch
  merge <name> [summary]                 Merge branch back to main
  branches                               List all branches

REFLECTION
  reflect                                Analyze recent context + suggest improvements

CONFIG
  config                                 Show current config
  config set <key> <value>               Update config value

FLAGS
  --verbose                              Show detailed output
  --help, -h                             Show this help

EXAMPLES
  agent-context init
  agent-context snapshot
  agent-context commit "implemented auth flow"
  agent-context branch try-qdrant "evaluate vector search"
  agent-context remember --decision "chose Qdrant over Pinecone"
  agent-context remember --pattern "always check Grafana before fixing"
  agent-context remember --mistake "never force-push fix branches"
  agent-context search "authentication"

MORE INFO
  https://github.com/lmaksym/agent-context
`.trim());
}
