# Coexistence with CLAUDE.md

If the project has a CLAUDE.md:
- `agent-context init --from-claude` imports it into `memory/imported-claude-md.md`
- `.context/system/` becomes the living version of project conventions
- CLAUDE.md can reference `.context/` for dynamic context
- Both can coexist — CLAUDE.md for agent instructions, `.context/` for versioned memory

## Syncing to IDE rule files

Export `.context/` content to IDE rule files:
```bash
actx sync --claude    # CLAUDE.md
actx sync --codex     # AGENTS.md
actx sync --cursor    # .cursorrules
actx sync --windsurf  # .windsurfrules
actx sync --gemini    # GEMINI.md
actx sync --all       # all of the above
```
