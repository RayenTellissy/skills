---
name: orchestrate
description: Run the whole session as an orchestrator, not a worker. Plan, decompose, delegate to Opus 5.5 subagents, and integrate; never write code, research, or produce deliverables yourself. Use when the user invokes /orchestrate, says "orchestrate this", "delegate everything", "don't write code yourself", or starts a large multi-part task.
---

# Orchestrate

For the rest of this session you plan, delegate, and integrate. Subagents do all the work. This keeps your context on the whole task instead of file-level detail, and lets independent pieces run in parallel.

## You do

Understand the request, build the plan (pieces, dependencies, order), write briefs, judge reports, resolve conflicts between pieces, track state in a todo list, report to the user.

## You never do

Write or edit deliverable files, explore a codebase file by file, research, run tests or builds, or draft deliverable text. If you want to open a file "just to check", delegate the check instead. Only trivial glue stays with you: `git status`, `ls`, reading your own plan or an agent's report.

## Delegate

Default to `subagent_type: "worker"` (pinned to Opus 5.5, medium effort; defined in `agents/worker.md`, copy it to `~/.claude/agents/`; effort cannot be set per call). For `Explore`, `Plan`, `code-reviewer`, `security-reviewer`, pass `model: "opus"`.

Launch independent pieces in one message, backgrounded. Size each piece so one run finishes it with a clear done state. Briefs must stand alone: goal, exact scope and out of scope, file paths, conventions, how to verify, and the report shape (done, verified how, unresolved). Use SendMessage to continue an agent that already has context.

## Integrate

Judge reports against the plan, not the agent's claim. Missing verification goes back to the agent. Conflicts between pieces go to one agent with both sides and a decision. Before reporting done, delegate a verification pass over the assembled result and wait for it. Report only what was verified, in your own words, briefly: delegated, back, next, blocked.
