# agent-mem

> 🚧 **Alpha** — functional but evolving. Feedback welcome.

Persistent, git-backed memory for AI coding agents. Like [agent-browser](https://github.com/vercel-labs/agent-browser), but for memory.

## The Problem

AI coding agents lose context between sessions. `CLAUDE.md` is manual. Memory files get stale. When you start a new session, you "re-teach" the agent everything — project conventions, past decisions, what you tried and why.

**agent-mem** gives agents a structured, versioned context filesystem they can read and write through bash. It works with Claude Code, Codex, Cursor, Windsurf, Gemini CLI — any agent that can run shell commands.

On `init`, the [Agent Skills](https://agentskills.io) skill is automatically installed to the 3 universal directories that cover ~14 tools: `.claude/skills/`, `.agents/skills/`, `.github/skills/`. It also auto-syncs trigger-based instructions to any detected IDE rule files (CLAUDE.md, GEMINI.md, AGENTS.md, `.cursor/rules/`, `.windsurfrules`).

## Install

```bash
npm install -g agent-mem
```

## Quick Start

```bash
agent-mem init        # Bootstrap from codebase
agent-mem snapshot    # Agent's primary view
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

The agent sees the full tree. Pinned files are loaded. Everything else is a summary — drill down with `agent-mem read <path>`.

## How Agents Use It

```bash
# 1. Start session — understand current state
agent-mem snapshot
agent-mem read memory/decisions.md

# 2. Do work...

# 3. Record decisions, patterns, mistakes
agent-mem remember --decision "Chose PKCE over implicit grant for mobile OAuth"
agent-mem remember --pattern "Always validate WebSocket reconnection with heartbeat"
agent-mem remember --mistake "Don't use dynamic imports for server components"

# 4. Record lessons learned (any problem you debugged/fixed)
agent-mem lesson "WebSocket reconnect -> validate readiness state, not just connection"

# 5. Checkpoint progress
agent-mem commit "implemented OAuth PKCE flow"

# 6. Explore something uncertain
agent-mem branch try-qdrant "evaluate Qdrant vs Pinecone"
# ... experiment ...
agent-mem merge try-qdrant "Qdrant wins — self-hosted, better filtering"

# 7. Next session — everything is still there
agent-mem snapshot
```

## Commands

### Core

```bash
agent-mem init [--from-claude]    # Bootstrap .context/ + auto-sync IDE rules
agent-mem snapshot                # Context tree with pinned content
agent-mem read <path>             # Read a specific context file
agent-mem write <path> --content "text"  # Write a context file (also reads stdin)
agent-mem commit [message]        # Git-backed checkpoint
agent-mem status                  # Quick status overview
```

`--from-claude` imports your existing `CLAUDE.md` into `.context/memory/imported-claude-md.md` so past conventions are preserved.

### Memory

```bash
agent-mem remember --decision "chose X because Y"   # → memory/decisions.md
agent-mem remember --pattern "always do X before Y"  # → memory/patterns.md
agent-mem remember --mistake "never do X"            # → memory/mistakes.md
agent-mem remember --note "general observation"      # → memory/notes.md
agent-mem lesson "API 429 -> implement backoff"      # → memory/lessons.md (shorthand)
agent-mem lesson "fix" --problem "OOM" --resolution "close DB conns" --tags "infra"
agent-mem search <query>          # Grep across all context files
agent-mem pin <path>              # Move to system/ (always in context)
agent-mem unpin <path>            # Move out of system/
```

### Branches

```bash
agent-mem branch <name> [purpose] # Create exploration branch
agent-mem switch <name>           # Switch active branch
agent-mem merge <name> [summary]  # Merge findings back to main
agent-mem branches                # List all branches
```

### Compaction & Maintenance

```bash
agent-mem compact                 # Archive stale, keep pins + recent
agent-mem compact --dry-run       # Preview what would be archived
agent-mem compact --hard          # Pins only, archive everything else
agent-mem forget <path>           # Remove memory file (archived first)
agent-mem resolve                 # Auto-resolve .context/ merge conflicts
agent-mem resolve --dry-run       # Preview resolution strategy
agent-mem diff <branch>           # Compare branch context with main
```

### Reflection

```bash
agent-mem reflect                 # Gather reflection input
agent-mem reflect save --content "..."  # Save structured reflection
agent-mem reflect history         # Past reflections + themes
agent-mem reflect defrag          # Analyze memory health
```

### Sync & Sharing

```bash
agent-mem sync                    # Export to IDE rule files (auto-detect)
agent-mem sync --claude           # Export to CLAUDE.md
agent-mem sync --codex            # Export to AGENTS.md
agent-mem sync --cursor           # Export to .cursor/rules/
agent-mem sync --windsurf         # Export to .windsurfrules
agent-mem sync --gemini           # Export to GEMINI.md
agent-mem sync --all              # Export to all formats
agent-mem track                   # Toggle .context/ in project git
agent-mem push                    # Push .context/ to remote
agent-mem pull                    # Pull .context/ from remote
agent-mem share                   # Generate portable snapshot
agent-mem import <file>           # Import shared snapshot
```

### Config

```bash
agent-mem config                  # Show current config
agent-mem config set <key> <val>  # Update config
```

## Directory Structure

`agent-mem init` creates a `.context/` directory in your project:

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
│   ├── mistakes.md      # Anti-patterns to avoid
│   └── lessons.md       # Lessons learned (problem/resolution pairs)
├── branches/            # Exploration branches with purpose tracking
├── reflections/         # Reflection outputs and synthesis
└── archive/             # Archived context from compact/forget (never deleted)
```

Every change is git-versioned inside `.context/`. Human-readable markdown, diffable, shareable.

## Coming Soon

- **Multi-agent coordination** — Git worktrees for concurrent agent sessions
- **Semantic search** — Vector-based search across context (current: grep)
- **Sleep-time reflection** — Automated reflection triggered by commit thresholds

## Design Principles

- **CLI-first** — bash commands, works in any IDE/agent
- **Agent-native output** — structured text optimized for LLMs
- **Zero config** — `init` and go
- **Git-backed** — every change versioned and diffable
- **Progressive disclosure** — tree shows structure, drill down for details
- **Zero dependencies** — Node.js 18+ only

## Aliases

```bash
agent-mem snapshot
amem snapshot             # short alias
```

## Inspired By

- [agent-browser](https://github.com/vercel-labs/agent-browser) — CLI-first pattern for AI agents
- [GCC](https://arxiv.org/abs/2508.00031) — Git-inspired COMMIT/BRANCH/MERGE for context
- [Letta Context Repos](https://www.letta.com/blog/context-repositories) — Git-backed memory filesystem
- [OneContext](https://github.com/TheAgentContextLab/OneContext) — Cross-agent context sharing
- [Anthropic Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — Progressive disclosure

## License

MIT
