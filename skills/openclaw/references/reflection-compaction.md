# Reflection & Compaction

## When to REFLECT

Reflection synthesizes learnings across multiple commits into structured insights.

**Triggers — always reflect:**
- After completing a multi-step feature (5+ commits)
- Before ending a long session
- When you notice re-discovering the same things
- When switching between very different problem domains

### The Reflect Cycle

```bash
# 1. Gather context (reads git history + memory state)
actx reflect

# 2. Think about: patterns, contradictions, missing knowledge, outdated entries

# 3. Save structured reflection
actx reflect save --content "## Patterns Identified
- WebSocket reconnection needs state validation

## Decisions Validated
- PKCE for mobile OAuth confirmed correct

## Contradictions Found
- Earlier said REST-only, now using WebSocket. Resolution: REST for CRUD, WS for real-time.

## Stale Entries
- memory/patterns.md: Use REST for all API endpoints

## Gaps Filled
- type: pattern
  text: Always validate WebSocket readiness state, not just connection status

## Themes
- Real-time architecture is the dominant concern

## Summary
Focused on real-time reliability. Key insight: connection != readiness."
```

### Reflection History

```bash
actx reflect history              # Past reflections + recurring themes
actx reflect history --last 3     # Last 3 only
```

## When to COMPACT

Compact when context is bloated and you want to continue with less noise.

```bash
actx compact --dry-run    # Preview what would be archived
actx compact              # Archive stale, keep pins + last 7 days
actx compact --hard       # Pins only, archive everything else
```

**Use compact when:**
- Context window filling up mid-task
- Want lower noise without losing critical decisions
- Switching focus within same session

**Compact always:**
- Auto-commits before running (safety net)
- Archives to `.context/archive/compact-YYYY-MM-DD/` (never deletes)
- Reports byte size before/after

### Compact vs Reflect

- **Compact** = pruner (removes noise)
- **Reflect** = synthesizer (extracts insights)

Different tools, clean separation. Often used together: reflect first (extract value), then compact (clean up).

## Memory Defrag

When memory files get large or stale:
```bash
actx reflect defrag --dry-run   # Analyze health (read-only)
actx reflect defrag             # Apply stale markers (non-destructive)
```
