# Manage Project Context

Use agent-context CLI to manage your project's persistent memory.

## Arguments
$ARGUMENTS: `snapshot | commit <msg> | remember --<category> <text> | branch <name> | search <query>`

## Instructions

1. If no arguments or "snapshot": run `agent-context snapshot` and present the context tree
2. If "commit": run `agent-context commit <message>`  
3. If "remember": run `agent-context remember --<category> "<text>"`
4. If "branch": run `agent-context branch <name> "<purpose>"`
5. If "search": run `agent-context search "<query>"`
6. For any other command, pass directly: `agent-context <args>`

If `.context/` doesn't exist, run `agent-context init` first.

Always show the command output to the user.
