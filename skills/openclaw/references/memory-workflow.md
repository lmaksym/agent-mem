# Memory Workflow

## When to REMEMBER

Use structured categories — don't dump everything in notes.

```bash
# Architectural decisions with rationale
actx remember --decision "Chose Payload CMS over Directus — MIT license, lives inside Next.js"

# Patterns you've learned work well
actx remember --pattern "Always check Grafana logs before attempting code fixes"

# Things that went wrong — prevent repeating
actx remember --mistake "Never force-push to fix branches — make new commits"

# General observations
actx remember --note "Team prefers domain-driven folder structure"
```

## When to SEARCH

Before making decisions that might have prior context:
```bash
actx search "authentication"
actx search "database"
```

## When to PIN / UNPIN

Pin files the agent should ALWAYS see (coding conventions, critical decisions):
```bash
actx pin memory/decisions.md
```

Unpin files that are no longer critical:
```bash
actx unpin system/old-migration-notes.md
```

Keep `system/` lean — max 5-10 files. More files = more tokens = slower.

## When to FORGET

Remove obsolete memory files (archived first for safety):
```bash
actx forget memory/old-notes.md
```

**Safety rules:**
- Cannot forget pinned `system/` files — run `actx unpin` first
- Cannot forget `config.yaml`
- Always archives to `archive/forgotten-YYYY-MM-DD/` before deleting

## Reading & Writing

```bash
actx read memory/decisions.md          # Read specific file
actx write system/conventions.md "..." # Update file content (also reads stdin)
```
