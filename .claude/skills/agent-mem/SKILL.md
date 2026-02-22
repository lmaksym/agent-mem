---
name: agent-mem
description: Persistent, git-backed memory for coding sessions. Use when starting a session, remembering decisions/patterns/mistakes/lessons, recording problem→resolution pairs, branching for exploration, committing progress, or searching prior context.
argument-hint: "[command] [args] — e.g., snapshot, commit <msg>, remember --decision <text>, lesson \"problem -> fix\""
---

# agent-mem

Manage persistent, versioned memory across coding sessions via the `agent-mem` (or `amem`) CLI.

If `$ARGUMENTS` is provided, run:
```bash
agent-mem $ARGUMENTS
```
Always show the command output to the user.

## Starting a Session

```bash
agent-mem snapshot     # context tree + pinned files + memory summary
```

If no `.context/` exists, run `agent-mem init` first.

## Core Commands

### Remember vs Lesson — when to use what

| You just... | Use | Example |
|---|---|---|
| Made an architectural choice | `remember --decision` | "Chose Payload CMS over Directus" |
| Found a repeatable approach | `remember --pattern` | "Always check Grafana before fixing" |
| Did something wrong to avoid | `remember --mistake` | "Never force-push fix branches" |
| Have a general observation | `remember --note` | "Team prefers domain-driven structure" |
| **Solved a problem after investigation** | **`lesson`** | "API 429 -> exponential backoff" |
| **Debugged and fixed an issue** | **`lesson`** | "Voice cut off -> lower VAD threshold" |
| **Hit an API/infra limitation and found workaround** | **`lesson`** | "OOM after 1hr -> close DB connections" |

**Rule of thumb:** If there was a *problem* and you found a *resolution*, it's a lesson. If it's a one-liner rule or fact, use remember.

### Remember — structured memory

```bash
amem remember --decision "Chose Payload CMS over Directus — MIT license, lives inside Next.js"
amem remember --pattern "Always check Grafana logs before attempting code fixes"
amem remember --mistake "Never force-push to fix branches — make new commits"
amem remember --note "Team prefers domain-driven folder structure"
```

### Lesson — record what you solved and how

Use after debugging sessions, fixing errors, working around API limitations, or any time you investigated a problem and found a fix.

```bash
# Quick shorthand (problem -> resolution)
amem lesson "API 429 rate limit -> implement exponential backoff with jitter"
amem lesson "Voice pipeline cutting off speech -> lower VAD threshold to 0.3"

# Structured form with tags for better searchability
amem lesson "OOM fix" --problem "Memory leak after 1hr" --resolution "Close DB connections in finally block" --tags "infra, database"
```

### Commit — checkpoint progress

Commit after meaningful progress, not every small change. Good triggers: feature complete, architectural decision made, before switching tasks, before ending session.

```bash
amem commit "implemented WebRTC signaling refactor"
```

### Branch — explore uncertain ideas

Branch when you might want to abandon the work. Always merge back — even failed branches. The lesson is the value.

```bash
amem branch try-qdrant "evaluate Qdrant vs Pinecone for vector search"
amem switch try-qdrant       # switch active branch
amem branches                # list all branches
# ... explore ...
amem merge try-qdrant "Qdrant wins: self-hosted, better filtering, lower cost"
# OR if it failed:
amem merge try-qdrant "Qdrant filtering too slow, staying with Pinecone"
```

### Search — check prior context

Before making decisions that might have prior context:
```bash
amem search "authentication"
```

### Read / Write

```bash
amem read memory/decisions.md
amem write system/conventions.md "# Conventions ..."
```

### Pin / Unpin

Pin files the agent should always see. Keep `system/` lean (max 5-10 files).
```bash
amem pin memory/decisions.md
amem unpin system/old-migration-notes.md
```

### Status / Config / Help

```bash
amem status           # quick overview: commits, branches, uncommitted changes
amem config           # show current configuration
amem config set <key> <value>   # update a setting
amem help             # show all commands
```

## Session Workflow

```
1. amem snapshot              ← understand current state
2. ... do work ...
3. amem remember --decision "chose X because Y"     ← record decisions, patterns, mistakes
4. amem lesson "problem -> how you fixed it"         ← record any problem you solved
5. amem commit "what you did"
6. amem branch explore-z      ← if uncertain
7. ... explore ...
8. amem merge explore-z "findings"
9. amem commit "merged exploration results"
```

**After debugging or fixing errors:** Always record a lesson before committing. Future sessions will thank you.

## Additional References

For detailed guides on advanced workflows, see:
- [Reflection & compaction](references/reflection-compaction.md) — reflect cycle, defrag, compact
- [Branching & merging](references/branching-merging.md) — diff, resolve, forget
- [Sub-agent patterns](references/sub-agent-patterns.md) — spawn templates, timeout recovery, parallel task splitting
- [Collaboration & sharing](references/collaboration.md) — track, push, pull, share, import
- [Coexistence with CLAUDE.md](references/coexistence.md) — importing and syncing with IDE rule files
