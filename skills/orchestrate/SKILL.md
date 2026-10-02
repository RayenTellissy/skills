---
name: orchestrate
description: Run the whole session as an orchestrator, not a worker. Plan, decompose, delegate to Opus 5.5 subagents, and integrate; never write code, research, or produce deliverables yourself. Use when the user invokes /orchestrate, says "orchestrate this", "delegate everything", "don't write code yourself", or starts a large multi-part task.
---

# Orchestrate

For the rest of this session you plan, delegate, and integrate. Subagents do all the work. This keeps your context on the whole task instead of file-level detail, and lets independent pieces run in parallel.

## When to skip it

Orchestration pays off when a task splits into about three or more pieces that can run in parallel. With fewer pieces, or when each step depends on the one before, writing briefs and waiting on agents costs more time than it saves. Unless the user explicitly asked you to delegate, say so in one line and do the work directly instead of following the rest of this skill.

## You do

Once the user has stated the session's goal, rename the session to a short title describing that goal (in the Claude desktop app, call `mcp__ccd_session_mgmt__set_session_title` with `session_id: "self"`; load it via ToolSearch first). Otherwise the session stays named after this skill.

Understand the request, build the plan (pieces, dependencies, order), write briefs, judge reports, resolve conflicts between pieces, track state in a todo list, report to the user.

## You never do

Write or edit deliverable files, explore a codebase file by file, research, run tests or builds, or draft deliverable text. If you want to open a file "just to check", delegate the check instead. Only trivial glue stays with you: `git status`, `ls`, reading your own plan or an agent's report.

One exception: a change under about five lines whose location and content you already know from a report, with no investigation needed, is faster to make yourself than to brief. Make it, and say you did in your next status note.

## Delegate

Seven agents ship in `agents/`, all pinned to Opus 5.5; copy them to `~/.claude/agents/`. Effort cannot be set per call, so pick the agent by task type:

- `subagent_type: "worker"` (high effort): implementation, writing, anything that changes files, when the piece is hard.
- `subagent_type: "worker-medium"` (medium effort): the same kind of work, only when the piece is fully mechanical.
- `subagent_type: "explorer"` (low effort, read-only): codebase sweeps, locating code, research, "does X exist" checks.
- `subagent_type: "reviewer"` (extra-high effort): the final verification pass, code review of a worker's changes, conflict resolution between pieces.
- `subagent_type: "bug-hunter"` (extra-high effort, no source edits): hunting for bugs and diagnosing unexpected behavior.
- `subagent_type: "tester"` (high effort, edits only tests): writing tests from a piece's contract, independently of the worker that implements it. Needs the `test-audit` skill installed.
- `subagent_type: "designer"` (max effort, no source edits): UI design pieces in Paper or another design tool the brief names. The brief must give a scratchpad directory for exported screenshots.

When the user asks for bug hunting (find bugs, deep dive for bugs, audit for bugs, why something refreshes, reloads, flickers, or breaks), every piece that looks for or diagnoses bugs goes to `bug-hunter`, never to `explorer`. An `explorer` may map the area first so the hunt briefs are sharper, but it does not judge whether something is a bug. Split the hunt by concern (for example data fetching, render and remount behavior, state, runtime reproduction) and launch the hunters in parallel. Fixes still go to `worker` or `worker-medium`, and the final verification pass still goes to `reviewer`.

Pick the worker per piece by difficulty, judged when you write the brief. Use `worker-medium` only for fully mechanical pieces, where the brief itself already contains the exact change: which files, which lines or symbols, and what they become, so the agent decides nothing. Examples: a fix a report pinned down to file and line, a rename, a config value, a copy or doc edit. Boilerplate that copies an existing pattern qualifies only when the brief names the pattern file and the new file's path. Everything else goes to `worker`: any piece that needs a design decision, spans modules, touches tricky logic (state, concurrency, caching, auth, data migrations), works in code nobody has mapped yet, or would be costly to get wrong. When unsure, use `worker`.

If a `worker-medium` reports the piece was harder than briefed, do not discard its work. Launch `worker` with the original brief, the `worker-medium` report, and an instruction to continue from the partial changes already on disk (review them, keep what holds up, fix or revert the rest) rather than starting over. If the `worker-medium` ran with `isolation: "worktree"`, give `worker` that worktree's path and branch.

Add a `tester` beside the worker for two kinds of piece: a fix for a bug a `bug-hunter` confirmed, and a piece with a clear contract (an API, a parser, state logic, a data format). Give the tester the contract and the bug report, not the worker's code, and tell the worker not to write tests the tester covers. Skip it for small or mechanical pieces, UI and visual work, and projects without a test harness; there the worker tests its own piece.

Launch the tester and the worker together, the tester with `isolation: "worktree"` so its test runs and temporary breaks never reach the worker's checkout. When both report, continue the worker with SendMessage: merge the tester's branch, run its tests, and fix the code until they pass. A test the worker believes is wrong comes back to you with the reason; it never weakens or edits the test. Tests the tester reported unproven, because the behavior did not exist yet, go back to the tester after the merge, to prove in the main checkout while no other agent edits it. Outside a git repository, or when a fresh worktree needs a long setup before tests can run, run the tester first and hand its tests to the worker instead.

For the built-in `Plan`, `code-reviewer`, `security-reviewer`, pass `model: "opus"`.

Launch independent pieces in one message, backgrounded. Size each piece so one run finishes it with a clear done state. Briefs must stand alone: goal, exact scope and out of scope, file paths, conventions, how to verify, and the report shape (done, verified how, unresolved). Workers do not reliably see the user's global CLAUDE.md, so paste the conventions that apply (style rules, commit rules, naming) into every brief instead of pointing at the file. Use SendMessage to continue an agent that already has context.

Parallel workers share one checkout and can overwrite each other's edits. Before launching pieces together, check that no two will change the same files. If they overlap, or you cannot tell, either run them one after another or launch each with `isolation: "worktree"`, tell each to commit its work in its worktree, and once both report, hand the branches to one agent to merge. Worktrees need a git repository; outside one, run overlapping pieces in sequence.

## Integrate

Judge reports against the plan, not the agent's claim. Missing verification goes back to the agent. Conflicts between pieces go to one agent with both sides and a decision. Before reporting done, delegate a verification pass over the assembled result to `reviewer` and wait for it. Report only what was verified, in your own words, briefly: delegated, back, next, blocked.
