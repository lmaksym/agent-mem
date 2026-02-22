# Skill: agent-context

Context management for your coding session. Use these CLI commands to maintain persistent, versioned memory across sessions.

## Starting a Session

Always begin with:
```bash
agent-context snapshot
```
This gives you the project context tree. Read pinned `system/` files for conventions, stack info, and project overview.

If no `.context/` exists:
```bash
agent-context init
```

## When to COMMIT

Commit after meaningful progress — not every small change.

**Do commit after:**
- Implementing a feature or fixing a bug
- Making an architectural decision
- Completing a research/exploration task
- Before switching to a different task
- Before ending a session

```bash
agent-context commit "implemented WebRTC signaling refactor"
```

**Don't commit after:**
- Minor file edits
- Failed attempts (branch instead)
- Routine operations

## When to BRANCH

Branch when exploring something uncertain — you might want to abandon it.

```bash
agent-context branch try-qdrant "evaluate Qdrant vs Pinecone for vector search"
```

**Good branch reasons:**
- Trying a risky refactor
- Evaluating alternative libraries/approaches
- Prototyping before committing to a direction

**After exploring:**
```bash
# If it worked — merge findings back
agent-context merge try-qdrant "Qdrant wins: self-hosted, better filtering, lower cost"

# If it failed — merge the LESSON, not the code
agent-context merge try-qdrant "Qdrant filtering too slow for our use case, staying with Pinecone"
```

Always merge — even failed branches. The lesson is the value.

## When to REMEMBER

Use structured categories — don't dump everything in notes.

```bash
# Architectural decisions with rationale
agent-context remember --decision "Chose Payload CMS over Directus — MIT license, lives inside Next.js"

# Patterns you've learned work well
agent-context remember --pattern "Always check Grafana logs before attempting code fixes"

# Things that went wrong — prevent repeating
agent-context remember --mistake "Never force-push to fix branches — make new commits"

# General observations
agent-context remember --note "Team prefers domain-driven folder structure"
```

## When to SEARCH

Before making decisions that might have prior context:
```bash
agent-context search "authentication"
agent-context search "database"
```

## When to PIN / UNPIN

Pin files the agent should ALWAYS see (coding conventions, critical decisions):
```bash
agent-context pin memory/decisions.md
```

Unpin files that are no longer critical:
```bash
agent-context unpin system/old-migration-notes.md
```

Keep `system/` lean — max 5-10 files. More files = more tokens = slower.

## Reading Specific Files

When snapshot shows a file you need details on:
```bash
agent-context read memory/decisions.md
agent-context read branches/try-qdrant/purpose.md
```

## Writing Context

Update conventions or add structured memory:
```bash
agent-context write system/conventions.md "# Conventions

## Code Style
- Use server components by default
- Domain-driven folder structure
- Tailwind v4 CSS-first config

## Git
- Feature branches: feat/xxx
- Never force-push
"
```

## Session Workflow

```
1. agent-context snapshot          ← understand current state
2. ... do work ...
3. agent-context remember --decision "chose X because Y"
4. agent-context commit "what you did"
5. ... more work ...
6. agent-context branch explore-z  ← if uncertain
7. ... explore ...
8. agent-context merge explore-z "findings"
9. agent-context commit "merged exploration results"
```

## Coexistence with CLAUDE.md

If the project has a CLAUDE.md:
- `agent-context init --from-claude` imports it into `memory/imported-claude-md.md`
- `.context/system/` becomes the living version of project conventions
- CLAUDE.md can reference `.context/` for dynamic context
- Both can coexist — CLAUDE.md for agent instructions, .context/ for versioned memory
