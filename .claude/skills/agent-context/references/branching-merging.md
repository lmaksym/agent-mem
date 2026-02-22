# Branching, Merging & Cleanup

## Diff — compare before merging

Compare a branch's context against main before merging:
```bash
actx diff try-qdrant              # summary view
actx diff try-qdrant --verbose    # show actual line changes
```

## Resolve — auto-resolve merge conflicts

After git operations that create merge conflicts in `.context/`:
```bash
actx resolve --dry-run   # Preview resolution strategy per file
actx resolve             # Auto-resolve all conflicts
```

**Resolution strategies (automatic):**
- `memory/` files — append-only merge (keep both sides, deduplicate exact matches)
- `config.yaml` — prefer-ours (keep local settings)
- Other files — keep-both (concatenate with separator)

## Forget — remove obsolete memory

Remove obsolete memory files (archived first for safety):
```bash
actx forget memory/old-notes.md
```

**Safety rules:**
- Cannot forget pinned `system/` files — run `actx unpin` first
- Cannot forget `config.yaml`
- Always archives to `archive/forgotten-YYYY-MM-DD/` before deleting
