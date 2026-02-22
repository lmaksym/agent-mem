# agent-context

Context management CLI for AI coding agents. Like [agent-browser](https://github.com/vercel-labs/agent-browser), but for memory.

Works with: Claude Code, Codex, Cursor, Windsurf, Antigravity — any agent that can run shell commands.

## Install

```bash
npm install -g agent-context
```

## Quick Start

```bash
agent-context init                           # Bootstrap context from codebase
agent-context snapshot                       # Get context tree (agent's primary view)
agent-context commit "implemented auth"      # Checkpoint progress
agent-context remember "check logs first"    # Quick-add to memory
agent-context search "authentication"        # Search across context
```

## Commands

### Core

```bash
agent-context init [--from-claude]    # Bootstrap from codebase (imports CLAUDE.md)
agent-context snapshot                # Context tree with pinned content
agent-context read <path>             # Read a specific context file
agent-context write <path>            # Write/update a context file
agent-context commit [message]        # Checkpoint: summarize + git commit
agent-context status                  # Quick status overview
```

### Memory

```bash
agent-context remember <text>         # Quick-add to memory
agent-context search <query>          # Search across all context files
agent-context pin <path>              # Move to system/ (always in context)
agent-context unpin <path>            # Move out of system/
```

### Branches (Exploration)

```bash
agent-context branch <name> [purpose] # Create exploration branch
agent-context switch <name>           # Switch active branch
agent-context merge <name> [summary]  # Merge branch findings back
agent-context branches                # List all branches
```

### Config

```bash
agent-context config                  # Show current config
agent-context config set <key> <val>  # Update config
```

## How It Works

`agent-context init` creates a `.context/` directory in your project:

```
.context/
├── main.md              # Project roadmap and goals
├── config.yaml          # Settings
├── system/              # Always loaded into agent context
│   ├── project.md       # Project overview (auto-detected)
│   └── conventions.md   # Coding conventions
├── memory/              # Learned context (summaries only in snapshot)
├── branches/            # Exploration branches
└── reflections/         # Sleep-time reflection outputs
```

Every change is git-versioned inside `.context/`. The `snapshot` command shows the full tree with pinned content — designed for LLM consumption.

## Design Principles

1. **CLI-first** — just bash commands, works everywhere
2. **Agent-native output** — structured text optimized for LLMs
3. **Zero config** — `init` and go
4. **Git-backed** — every change versioned
5. **Progressive disclosure** — tree shows structure, drill down for details
6. **Zero dependencies** — Node.js 18+ only

## Aliases

```bash
agent-context snapshot
actx snapshot             # short alias
```

## Inspired By

- [agent-browser](https://github.com/vercel-labs/agent-browser) — CLI pattern for AI agents
- [GCC](https://arxiv.org/abs/2508.00031) — Git-inspired context management (COMMIT/BRANCH/MERGE)
- [Letta Context Repos](https://www.letta.com/blog/context-repositories) — Git-backed memory filesystem
- [OneContext](https://github.com/TheAgentContextLab/OneContext) — Cross-agent context sharing

## License

MIT
