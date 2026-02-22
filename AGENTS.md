# agent-context

Persistent, versioned memory for AI coding agents. This project has a `.context/` directory managed by the `agent-context` CLI (`actx`). Use it to maintain context across sessions.

## Starting a Session

Always begin with:
```bash
actx snapshot
```
This shows the context tree with pinned `system/` files. Read those for project conventions, stack info, and overview.

If no `.context/` exists:
```bash
actx init
```

## Core Commands

### Remember — Structured Memory

```bash
actx remember --decision "Chose Payload CMS over Directus — MIT license, lives inside Next.js"
actx remember --pattern "Always check Grafana logs before attempting code fixes"
actx remember --mistake "Never force-push to fix branches — make new commits"
actx remember --note "Team prefers domain-driven folder structure"
```

### Commit — Checkpoint Progress

Commit after meaningful progress, not every small change.

```bash
actx commit "implemented WebRTC signaling refactor"
```

Do commit after: implementing features, making decisions, completing research, before ending sessions.

### Search — Find Prior Context

Before making decisions that might have prior context:
```bash
actx search "authentication"
```

### Read / Write — Access Context Files

```bash
actx read memory/decisions.md
actx write system/conventions.md --content "# Conventions\n- Use server components by default"
```

### Pin / Unpin — Control Visibility

Pin files the agent should always see. Keep `system/` lean (max 5-10 files).
```bash
actx pin memory/decisions.md
actx unpin system/old-migration-notes.md
```

## Branches — Explore Safely

Branch when exploring something uncertain.

```bash
actx branch try-qdrant "evaluate Qdrant vs Pinecone for vector search"

# After exploring — always merge, even failures (the lesson is the value)
actx merge try-qdrant "Qdrant wins: self-hosted, better filtering, lower cost"

# Compare before merging
actx diff try-qdrant              # summary
actx diff try-qdrant --verbose    # line details
```

## Reflect — Synthesize Learnings

Reflection extracts patterns, contradictions, and gaps from recent work.

**When to reflect:** After 5+ commits, before ending long sessions, when re-discovering the same things.

```bash
# Step 1: Gather context (CLI reads git history + memory state)
actx reflect

# Step 2: Read the output, reason about patterns/contradictions/gaps

# Step 3: Save structured reflection
actx reflect save --content "## Patterns Identified
- WebSocket reconnection needs state validation

## Decisions Validated
- PKCE for mobile OAuth confirmed as correct

## Contradictions Found
- Earlier said REST-only, now using WebSocket for streaming. Resolution: REST for CRUD, WS for real-time.

## Stale Entries
- memory/patterns.md: Use REST for all API endpoints

## Gaps Filled
- type: pattern
  text: Always validate WebSocket readiness state, not just connection status
- type: decision
  text: REST for CRUD operations, WebSocket for streaming

## Themes
- Real-time architecture is the dominant concern

## Summary
Focused on real-time reliability. Key insight: connection != readiness."
```

### Reflection sections (omit empty ones):
- `## Patterns Identified` — recurring approaches that work
- `## Decisions Validated` — earlier decisions confirmed by recent work
- `## Contradictions Found` — memory entries that conflict (include resolution)
- `## Stale Entries` — entries to flag as outdated (format: `file: entry text`)
- `## Gaps Filled` — new entries to add (use `type:` and `text:` sub-fields)
- `## Themes` — overarching directions
- `## Summary` — 2-3 sentences

### Other reflection commands:
```bash
actx reflect history              # past reflections + recurring themes
actx reflect history --last 3     # last 3 only
actx reflect defrag --dry-run     # analyze memory health
actx reflect defrag               # apply stale markers (non-destructive)
```

## Compact — Reduce Context Noise

Archive stale memory entries while preserving pins and recent context.

```bash
actx compact --dry-run    # preview what would be archived
actx compact              # archive entries older than 7 days, keep pins + recent
actx compact --hard       # pins only, archive everything else
```

**Use when:** context feels bloated, switching focus mid-session, context window pressure.

Compact always: auto-commits first (safety net), archives to `.context/archive/` (never deletes), reports size delta.

**Compact vs Reflect:** Compact prunes noise. Reflect synthesizes insights. Different tools.

## Resolve — Fix Merge Conflicts

After git operations that create conflicts in `.context/`:

```bash
actx resolve --dry-run    # preview strategy per file
actx resolve              # auto-resolve all conflicts
```

Strategies: memory files → append-only merge (deduplicate), config → prefer-ours, other → keep-both.

## Forget — Remove Obsolete Files

```bash
actx forget memory/old-notes.md
```

Always archives before deleting. Cannot forget pinned `system/` files or `config.yaml`.

## Session Workflow

```
1. actx snapshot                          ← understand current state
2. ... do work ...
3. actx remember --decision "chose X because Y"
4. actx commit "what you did"
5. ... more work ...
6. actx branch explore-z                  ← if uncertain
7. ... explore ...
8. actx merge explore-z "findings"
9. actx commit "merged exploration results"
```

## Sync — Export to IDE Rule Files

```bash
actx sync                 # auto-detect existing IDE files
actx sync --claude        # → CLAUDE.md
actx sync --codex         # → AGENTS.md
actx sync --cursor        # → .cursor/rules/
actx sync --windsurf      # → .windsurfrules
actx sync --gemini        # → GEMINI.md
actx sync --all           # → all formats
```
