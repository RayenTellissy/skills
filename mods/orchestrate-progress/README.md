# orchestrate-progress

A mod: a progress bar above the prompt and a live panel of subagents for the `/orchestrate` skill. A port of [savvy-progress](https://github.com/JohnnyVizz/claude-kit/tree/main/plugins/savvy-progress) to orchestrate's agents and phases.

- **Progress bar**: the goal's title, the phase (Plan, Tasks n/m, Verify, Done), done tasks out of planned, and a crew-size button that opens the panel. It appears as soon as `/orchestrate` runs, or when an orchestrate agent starts.
- **Agents panel** (`/agents-info` toggles it): a header with the estimated cost, tokens and time, then running, finished and planned subagents. Each run is drawn as the background-tasks list draws a task: the crab, the task description, the role (or agent type), model and effort, and at the right its status and elapsed time. Effort is the one the engine reported, or the role's default until it does. Each role is a crab in its own costume: the worker's wrench turns, the specialist floats in a space helmet, the explorer fences with a cutlass, the tester tosses an omelette, the bug-hunter sweeps a magnifier, the designer paints in a beret, and the reviewer waves the checkered flag. `prefers-reduced-motion` stops them.

## Install

```
/plugin install orchestrate-progress --marketplace RayenTellissy/skills
```

## How it hooks into /orchestrate

The skill and agent files stay unchanged. The mod adds its instructions to the skill as it loads:

- When `/orchestrate` expands, a "Progress bar" section is appended telling the orchestrator to report only the plan (and the full plan again on a re-plan) and the end through `mcp__orchestrate-progress__progress`, launching each task with an Agent description equal to its title.
- Agent briefs reach the engine unchanged; the mod only records each launch and how it ended for the panel.

Everything else follows the agents. A planned task is done when its latest run (matched by description) finished without error; a run still going or failed, or no run yet, leaves it open, and runs that match no task do not count. A non-explorer launch moves Plan to Tasks, and a reviewer launch moves the bar to Verify, so the bar also works when the orchestrator never reports.

Cost is a rough estimate from token counts and a built-in per-model price table (`PRICES` in `hooks/draw.ts`), not a bill.

## Files

- `hooks/register.tsx`: the hooks (tools, command, skill and spawn hooks, usage tracking, drawing).
- `hooks/draw.ts`: pure drawing and formatting, the crab costumes included.
- `types/index.d.ts`: the `$.state` contract.
- `tests/progress.test.ts`: run with `claude plugin test <this folder>`.
