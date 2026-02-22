---
name: agent-mem
description: Persistent, git-backed memory for coding sessions. Use when starting a session, remembering decisions/patterns/mistakes, branching for exploration, committing progress, or searching prior context.
argument-hint: "[command] [args] — e.g., snapshot, commit <msg>, remember --decision <text>"
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

### Remember — structured memory

```bash
amem remember --decision "Chose Payload CMS over Directus — MIT license, lives inside Next.js"
amem remember --pattern "Always check Grafana logs before attempting code fixes"
amem remember --mistake "Never force-push to fix branches — make new commits"
amem remember --note "Team prefers domain-driven folder structure"
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
3. amem remember --decision "chose X because Y"
4. amem commit "what you did"
5. amem branch explore-z      ← if uncertain
6. ... explore ...
7. amem merge explore-z "findings"
8. amem commit "merged exploration results"
```

## Additional References

For detailed guides on advanced workflows, see:
- [Reflection & compaction](references/reflection-compaction.md) — reflect cycle, defrag, compact
- [Branching & merging](references/branching-merging.md) — diff, resolve, forget
- [Sub-agent patterns](references/sub-agent-patterns.md) — spawn templates, timeout recovery, parallel task splitting
- [Collaboration & sharing](references/collaboration.md) — track, push, pull, share, import
- [Coexistence with CLAUDE.md](references/coexistence.md) — importing and syncing with IDE rule files
