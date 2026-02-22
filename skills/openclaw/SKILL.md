---
name: agent-context
description: Persistent context management for AI agent sessions using agent-context (actx) CLI. Use when spawning sub-agents, managing long-running tasks, checkpointing research, recovering from timeouts, or when any task needs persistent memory across sessions. Also use when the user mentions context, memory management, or agent-context/actx.
metadata: { "openclaw": { "emoji": "🧠", "requires": { "bins": ["node"] } } }
---

# agent-context (actx)

CLI for persistent, versioned context across agent sessions. Prevents context loss on timeouts, enables checkpoint/resume, and tracks decisions/patterns/mistakes.

## Binary

```bash
ACTX=/home/node/.openclaw/workspace/agent-context/bin/agent-context.js
# Or if globally installed:
actx <command>
```

## Session Start

Always begin sessions and sub-agent tasks with:

```bash
$ACTX snapshot
```

If no `.context/` exists: `$ACTX init`

## Core Commands

| Command | When to use |
|---------|------------|
| `snapshot` | Start of every session — understand current state |
| `commit <msg>` | After meaningful progress (feature, decision, research batch) |
| `remember --decision\|--pattern\|--mistake\|--note <text>` | Record learnings immediately |
| `search <query>` | Before decisions that might have prior context |
| `compact` | When context is bloated; `--dry-run` to preview, `--hard` for aggressive |
| `branch <name> <purpose>` | Uncertain exploration — might abandon |
| `merge <name> <summary>` | Always merge branches, even failed ones (lesson = value) |
| `read <path>` | Drill into specific context files |

## Sub-Agent Spawning Pattern

When spawning sub-agents for long tasks, include these instructions in the task:

```
CONTEXT MANAGEMENT:
1. Run: /home/node/.openclaw/workspace/agent-context/bin/agent-context.js snapshot
2. After EACH completed item, run: $ACTX remember --note "<finding>"
3. Every 3-5 items, run: $ACTX commit "checkpoint: <summary>"
4. On completion, run: $ACTX commit "done: <final summary>"

If this is a RETRY of a timed-out task:
1. Run: $ACTX snapshot  (see what previous run saved)
2. Run: $ACTX read memory/notes.md  (see completed items)
3. Skip already-completed items and continue from last checkpoint
```

## Metrics Tracking

After every sub-agent task completes (or fails), update metrics:

```bash
# File: /home/node/.openclaw/workspace/memory/agent-metrics.json
# Track: task id, status, completion_pct, retries, tokens, checkpointed (bool)
```

Compare `before_actx` vs `after_actx` sections for improvement measurement.

## Key Patterns

- **Checkpoint after each item** in research/multi-step tasks — never batch saves at end
- **Split large tasks** into 3-4 parallel sub-agents of 5 items each
- **Set `runTimeoutSeconds: 600-900`** for research sub-agents
- **Use Sonnet for research** sub-agents — faster, cheaper
- **Always merge failed branches** — the lesson is the value
- **Pin sparingly** — max 5-10 files in `system/`

## Reflection (periodic)

After 5+ commits or end of long session:

```bash
$ACTX reflect              # Gather context
$ACTX reflect save --content "## Patterns Identified\n..."
$ACTX reflect defrag       # Check memory health
```

## Detailed References

Load only when needed for the specific topic:

- **[references/memory-workflow.md](references/memory-workflow.md)** — when/how to remember, search, pin, forget, read/write
- **[references/branching-guide.md](references/branching-guide.md)** — branch, merge, diff — exploration workflow
- **[references/reflection-compaction.md](references/reflection-compaction.md)** — reflect cycle, compact, defrag — context maintenance
- **[references/sub-agent-patterns.md](references/sub-agent-patterns.md)** — spawn templates, timeout recovery, parallel splits, metrics tracking
