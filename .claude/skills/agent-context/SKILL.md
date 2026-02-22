---
name: agent-context
description: Persistent, git-backed context management for coding sessions. Use when starting a session, remembering decisions/patterns/mistakes, branching for exploration, committing progress, or searching prior context.
argument-hint: "[command] [args] — e.g., snapshot, commit <msg>, remember --decision <text>"
---

# agent-context

Manage persistent, versioned memory across coding sessions via the `agent-context` (or `actx`) CLI.

If `$ARGUMENTS` is provided, run:
```bash
agent-context $ARGUMENTS
```
Always show the command output to the user.

## Starting a Session

```bash
agent-context snapshot     # context tree + pinned files + memory summary
```

If no `.context/` exists, run `agent-context init` first.

## Core Commands

### Remember — structured memory

```bash
actx remember --decision "Chose Payload CMS over Directus — MIT license, lives inside Next.js"
actx remember --pattern "Always check Grafana logs before attempting code fixes"
actx remember --mistake "Never force-push to fix branches — make new commits"
actx remember --note "Team prefers domain-driven folder structure"
```

### Commit — checkpoint progress

Commit after meaningful progress, not every small change. Good triggers: feature complete, architectural decision made, before switching tasks, before ending session.

```bash
actx commit "implemented WebRTC signaling refactor"
```

### Branch — explore uncertain ideas

Branch when you might want to abandon the work. Always merge back — even failed branches. The lesson is the value.

```bash
actx branch try-qdrant "evaluate Qdrant vs Pinecone for vector search"
actx switch try-qdrant       # switch active branch
actx branches                # list all branches
# ... explore ...
actx merge try-qdrant "Qdrant wins: self-hosted, better filtering, lower cost"
# OR if it failed:
actx merge try-qdrant "Qdrant filtering too slow, staying with Pinecone"
```

### Search — check prior context

Before making decisions that might have prior context:
```bash
actx search "authentication"
```

### Read / Write

```bash
actx read memory/decisions.md
actx write system/conventions.md "# Conventions ..."
```

### Pin / Unpin

Pin files the agent should always see. Keep `system/` lean (max 5-10 files).
```bash
actx pin memory/decisions.md
actx unpin system/old-migration-notes.md
```

### Status / Config / Help

```bash
actx status           # quick overview: commits, branches, uncommitted changes
actx config           # show current configuration
actx config set <key> <value>   # update a setting
actx help             # show all commands
```

## Session Workflow

```
1. actx snapshot              ← understand current state
2. ... do work ...
3. actx remember --decision "chose X because Y"
4. actx commit "what you did"
5. actx branch explore-z      ← if uncertain
6. ... explore ...
7. actx merge explore-z "findings"
8. actx commit "merged exploration results"
```

## Additional References

For detailed guides on advanced workflows, see:
- [Reflection & compaction](references/reflection-compaction.md) — reflect cycle, defrag, compact
- [Branching & merging](references/branching-merging.md) — diff, resolve, forget
- [Sub-agent patterns](references/sub-agent-patterns.md) — spawn templates, timeout recovery, parallel task splitting
- [Collaboration & sharing](references/collaboration.md) — track, push, pull, share, import
- [Coexistence with CLAUDE.md](references/coexistence.md) — importing and syncing with IDE rule files
