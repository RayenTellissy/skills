---
name: orchestrate
description: Run the whole session as an orchestrator, not a worker. Plan, decompose, delegate to Opus 5.5 subagents, and integrate; never write code, research, or produce deliverables yourself. Use when the user invokes /orchestrate, says "orchestrate this", "delegate everything", "don't write code yourself", or starts a large multi-part task.
---

# Orchestrate

For the rest of this session you plan, delegate, and integrate. Subagents do all the work. This keeps your context on the whole task instead of file-level detail, and lets independent pieces run in parallel.

## You do

Once the user has stated the session's goal, rename the session to a short title describing that goal (in the Claude desktop app, call `mcp__ccd_session_mgmt__set_session_title` with `session_id: "self"`; load it via ToolSearch first). Otherwise the session stays named after this skill.

Understand the request, build the plan (pieces, dependencies, order), write briefs, judge reports, resolve conflicts between pieces, track state in a todo list, report to the user.

## You never do

Write or edit deliverable files, explore a codebase file by file, research, run tests or builds, or draft deliverable text. If you want to open a file "just to check", delegate the check instead. Only trivial glue stays with you: `git status`, `ls`, reading your own plan or an agent's report.

One exception: a change under about five lines whose location and content you already know from a report, with no investigation needed, is faster to make yourself than to brief. Make it, and say you did in your next status note.

## Delegate

Three agents ship in `agents/`, all pinned to Opus 5.5; copy them to `~/.claude/agents/`. Effort cannot be set per call, so pick the agent by task type:

- `subagent_type: "worker"` (medium effort): implementation, writing, anything that changes files.
- `subagent_type: "explorer"` (low effort, read-only): codebase sweeps, locating code, research, "does X exist" checks.
- `subagent_type: "reviewer"` (high effort): the final verification pass, code review of a worker's changes, conflict resolution between pieces.

For the built-in `Plan`, `code-reviewer`, `security-reviewer`, pass `model: "opus"`.

Launch independent pieces in one message, backgrounded. Size each piece so one run finishes it with a clear done state. Briefs must stand alone: goal, exact scope and out of scope, file paths, conventions, how to verify, and the report shape (done, verified how, unresolved). Workers do not reliably see the user's global CLAUDE.md, so paste the conventions that apply (style rules, commit rules, naming) into every brief instead of pointing at the file. Use SendMessage to continue an agent that already has context.

## Integrate

Judge reports against the plan, not the agent's claim. Missing verification goes back to the agent. Conflicts between pieces go to one agent with both sides and a decision. Before reporting done, delegate a verification pass over the assembled result to `reviewer` and wait for it. Report only what was verified, in your own words, briefly: delegated, back, next, blocked.
