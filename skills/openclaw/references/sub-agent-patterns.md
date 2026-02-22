# Sub-Agent Patterns

## Spawn Template

Embed actx calls AS workflow steps (not a separate block). Agents skip separate instruction blocks but follow numbered steps.

```
ACTX=/home/node/.openclaw/workspace/agent-context/bin/agent-context.js

STEP 1: Run $ACTX snapshot — read the output, this is your starting context.
STEP 2: [First item of actual work]. Then run: $ACTX remember --note "<what you found>"
STEP 3: [Next item]. Then run: $ACTX remember --note "<what you found>"
...continue pattern: do work → save finding...
STEP N (every 3 items): Run $ACTX commit "checkpoint: items 1-3 done"
FINAL STEP: Write output file, then run $ACTX commit "done: <summary>"
```

**Key principle:** Interleave actx into the task flow. Make `remember` the step right after each research item, not a separate section the agent can skip.

## Retry/Resume Template

For sub-agents retrying a timed-out task:

```
ACTX=/home/node/.openclaw/workspace/agent-context/bin/agent-context.js

STEP 1: Run $ACTX snapshot — review what the previous run saved.
STEP 2: Run $ACTX read memory/notes.md — these are completed items, skip them.
STEP 3: Continue from the first item NOT in notes.md.
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
