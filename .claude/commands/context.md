# Manage Project Context

Use agent-context CLI to manage your project's persistent memory.

## Arguments
$ARGUMENTS: `snapshot | commit <msg> | remember --<category> <text> | branch <name> | search <query> | compact [--dry-run|--hard] | resolve [--dry-run] | diff <branch> | forget <path>`

## Instructions

1. If no arguments or "snapshot": run `agent-context snapshot` and present the context tree
2. If "commit": run `agent-context commit <message>`  
3. If "remember": run `agent-context remember --<category> "<text>"`
4. If "branch": run `agent-context branch <name> "<purpose>"`
5. If "search": run `agent-context search "<query>"`
6. If "compact": run `agent-context compact [flags]` — archive stale context, keep pins + recent
7. If "resolve": run `agent-context resolve [flags]` — auto-resolve merge conflicts in .context/
8. If "diff": run `agent-context diff <branch>` — compare branch with main
9. If "forget": run `agent-context forget <path>` — remove memory file (archived first)
10. For any other command, pass directly: `agent-context <args>`

If `.context/` doesn't exist, run `agent-context init` first.

Always show the command output to the user.
