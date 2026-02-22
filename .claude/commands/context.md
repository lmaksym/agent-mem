# Manage Project Context

Use agent-mem CLI to manage your project's persistent memory.

## Arguments
$ARGUMENTS: `snapshot | commit <msg> | remember --<category> <text> | lesson "<problem> -> <resolution>" | branch <name> | search <query> | compact [--dry-run|--hard] | resolve [--dry-run] | diff <branch> | forget <path>`

## Instructions

1. If no arguments or "snapshot": run `agent-mem snapshot` and present the context tree
2. If "commit": run `agent-mem commit <message>`  
3. If "remember": run `agent-mem remember --<category> "<text>"`
3b. If "lesson": run `agent-mem lesson "<problem> -> <resolution>"` or with flags `--problem`, `--resolution`, `--tags`
4. If "branch": run `agent-mem branch <name> "<purpose>"`
5. If "search": run `agent-mem search "<query>"`
6. If "compact": run `agent-mem compact [flags]` — archive stale context, keep pins + recent
7. If "resolve": run `agent-mem resolve [flags]` — auto-resolve merge conflicts in .context/
8. If "diff": run `agent-mem diff <branch>` — compare branch with main
9. If "forget": run `agent-mem forget <path>` — remove memory file (archived first)
10. For any other command, pass directly: `agent-mem <args>`

If `.context/` doesn't exist, run `agent-mem init` first.

Always show the command output to the user.
