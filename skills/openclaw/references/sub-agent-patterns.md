# Sub-Agent Patterns

## Spawn Template

Include this block in every `sessions_spawn` task description for long-running work:

```
CONTEXT MANAGEMENT (agent-context):
ACTX=/home/node/.openclaw/workspace/agent-context/bin/agent-context.js

1. Start: $ACTX snapshot (understand current state)
2. After EACH completed item: $ACTX remember --note "<finding>"
3. Every 3-5 items: $ACTX commit "checkpoint: <summary>"
4. On completion: $ACTX commit "done: <final summary>"
```

## Retry/Resume Template

For sub-agents retrying a timed-out task:

```
CONTEXT RECOVERY (agent-context):
ACTX=/home/node/.openclaw/workspace/agent-context/bin/agent-context.js

1. $ACTX snapshot (see what previous run saved)
2. $ACTX read memory/notes.md (see completed items)
3. Skip already-completed items
4. Continue from last checkpoint
```

## Splitting Large Tasks

Never spawn one agent for 15+ sequential operations. Split instead:

**Bad:** 1 agent × 20 providers × (search + fetch + analyze) = timeout

**Good:** 4 agents × 5 providers each = parallel, each checkpoints independently

```
# Agent 1: providers 1-5
sessions_spawn(task="Research providers 1-5...\n\nCONTEXT: $ACTX branch batch-1 'providers 1-5'", runTimeoutSeconds=600)

# Agent 2: providers 6-10
sessions_spawn(task="Research providers 6-10...\n\nCONTEXT: $ACTX branch batch-2 'providers 6-10'", runTimeoutSeconds=600)

# After all complete: merge branches
$ACTX merge batch-1 "findings from providers 1-5"
$ACTX merge batch-2 "findings from providers 6-10"
$ACTX commit "consolidated all provider research"
```

## Timeout Settings

| Task type | Recommended timeout |
|-----------|-------------------|
| Simple (1-3 tool calls) | 120-300s |
| Research (5-10 searches) | 600s |
| Deep research (10+ searches) | 900s |
| Code review | 600s |
| Browser automation | 300-600s |

## Model Selection for Sub-Agents

- **Sonnet** for research tasks — faster, cheaper, less likely to timeout
- **Opus** for complex reasoning, code architecture decisions
- **Codex** for code review (when OAuth works)

## Metrics Tracking

After every sub-agent task, update `/home/node/.openclaw/workspace/memory/agent-metrics.json`:

```json
{
  "id": "task-name",
  "group": "telegram-group-name",
  "description": "what the task did",
  "status": "completed|timeout|failed",
  "completion_pct": 100,
  "checkpointed": true,
  "checkpoint_method": "actx",
  "retries": 0,
  "tokens_used": 25000,
  "recovered_from_timeout": false,
  "date": "2026-02-19"
}
```
