# agent-context

> 🚧 **Alpha** — functional but evolving. Feedback welcome.

Context management CLI for AI coding agents. Like [agent-browser](https://github.com/vercel-labs/agent-browser), but for memory.

## The Problem

AI coding agents lose context between sessions. `CLAUDE.md` is manual. Memory files get stale. When you start a new session, you "re-teach" the agent everything — project conventions, past decisions, what you tried and why.

**agent-context** gives agents a structured, versioned context filesystem they can read and write through bash. It works with Claude Code, Codex, Cursor, Windsurf, Antigravity — any agent that can run shell commands.

## Install

```bash
npm install -g agent-context
```

## Quick Start

```bash
agent-context init        # Bootstrap from codebase
agent-context snapshot    # Agent's primary view
```

### What `snapshot` returns:

```
📋 CONTEXT SNAPSHOT
Project: mockinterviewai | Branch: main | Commits: 12
Last commit: "refactored WebRTC signaling" (2h ago)

PINNED (system/) — always in agent context:
  --- system/project.md ---
  # mockinterviewai

  Real-time AI mock interview platform using Gemini Live.

  ## Stack
  Next.js 15, TypeScript, Gemini 2.5 Flash, WebRTC, GCP

  --- system/conventions.md ---
  # Conventions

  - Domain-driven folder structure
  - Server components by default
  - Never force-push fix branches

MEMORY (3 files):
  decisions.md — "12 entries, last: Chose Payload CMS over Directus"
  patterns.md — "8 patterns, last: Always check Grafana before fixing"
  mistakes.md — "3 entries, last: Never skip Codex review"

BRANCHES (1):
  try-qdrant — "evaluate vector search vs Pinecone" (3 commits)

CONFIG: auto_commit=false | reflection=manual
```

The agent sees the full tree. Pinned files are loaded. Everything else is a summary — drill down with `agent-context read <path>`.

## How Agents Use It

```bash
# 1. Start session — understand current state
agent-context snapshot
agent-context read memory/decisions.md

# 2. Do work...

# 3. Record what you learned
agent-context remember --decision "Chose PKCE over implicit grant for mobile OAuth"
agent-context remember --pattern "Always validate WebSocket reconnection with heartbeat"
agent-context remember --mistake "Don't use dynamic imports for server components"

# 4. Checkpoint progress
agent-context commit "implemented OAuth PKCE flow"

# 5. Explore something uncertain
agent-context branch try-qdrant "evaluate Qdrant vs Pinecone"
# ... experiment ...
agent-context merge try-qdrant "Qdrant wins — self-hosted, better filtering"

# 6. Next session — everything is still there
agent-context snapshot
```

## Commands

### Core

```bash
agent-context init [--from-claude]    # Bootstrap .context/ from codebase
agent-context snapshot                # Context tree with pinned content
agent-context read <path>             # Read a specific context file
agent-context write <path> --content "text"  # Write a context file (also reads stdin)
agent-context commit [message]        # Git-backed checkpoint
agent-context status                  # Quick status overview
```

`--from-claude` imports your existing `CLAUDE.md` into `.context/memory/imported-claude-md.md` so past conventions are preserved.

### Memory

```bash
agent-context remember --decision "chose X because Y"   # → memory/decisions.md
agent-context remember --pattern "always do X before Y"  # → memory/patterns.md
agent-context remember --mistake "never do X"            # → memory/mistakes.md
agent-context remember --note "general observation"      # → memory/notes.md
agent-context search <query>          # Grep across all context files
agent-context pin <path>              # Move to system/ (always in context)
agent-context unpin <path>            # Move out of system/
```

### Branches

```bash
agent-context branch <name> [purpose] # Create exploration branch
agent-context switch <name>           # Switch active branch
agent-context merge <name> [summary]  # Merge findings back to main
agent-context branches                # List all branches
```

### Config

```bash
agent-context config                  # Show current config
agent-context config set <key> <val>  # Update config
```

## Directory Structure

`agent-context init` creates a `.context/` directory in your project:

```
.context/
├── main.md              # Project roadmap and goals
├── config.yaml          # Settings
├── system/              # Always loaded into agent context (pinned)
│   ├── project.md       # Auto-detected: name, stack, structure
│   └── conventions.md   # Coding conventions and style rules
├── memory/              # Learned context (tree visible, content on demand)
│   ├── decisions.md     # Architectural decisions with rationale
│   ├── patterns.md      # Learned best practices
│   └── mistakes.md      # Anti-patterns to avoid
├── branches/            # Exploration branches with purpose tracking
└── reflections/         # (coming soon) Reflection outputs
```

Every change is git-versioned inside `.context/`. Human-readable markdown, diffable, shareable.

## Coming Soon

- **`reflect`** — Background reflection that reviews recent commits and extracts patterns, decisions, and mistakes automatically
- **Compaction** — Garbage collection for memory files that grow too large
- **Multi-agent coordination** — Git worktrees for concurrent agent sessions

## Design Principles

- **CLI-first** — bash commands, works in any IDE/agent
- **Agent-native output** — structured text optimized for LLMs
- **Zero config** — `init` and go
- **Git-backed** — every change versioned and diffable
- **Progressive disclosure** — tree shows structure, drill down for details
- **Zero dependencies** — Node.js 18+ only

## Aliases

```bash
agent-context snapshot
actx snapshot             # short alias
```

## Inspired By

- [agent-browser](https://github.com/vercel-labs/agent-browser) — CLI-first pattern for AI agents
- [GCC](https://arxiv.org/abs/2508.00031) — Git-inspired COMMIT/BRANCH/MERGE for context
- [Letta Context Repos](https://www.letta.com/blog/context-repositories) — Git-backed memory filesystem
- [OneContext](https://github.com/TheAgentContextLab/OneContext) — Cross-agent context sharing
- [Anthropic Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — Progressive disclosure

## License

MIT
