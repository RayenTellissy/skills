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

Six agents ship in `agents/`, all pinned to Opus 5.5; copy them to `~/.claude/agents/`. Effort cannot be set per call, so pick the agent by task type:

- `subagent_type: "worker"` (high effort): implementation, writing, anything that changes files, when the piece is hard.
- `subagent_type: "worker-medium"` (medium effort): the same kind of work, only when the piece is fully mechanical.
- `subagent_type: "explorer"` (low effort, read-only): codebase sweeps, locating code, research, "does X exist" checks.
- `subagent_type: "reviewer"` (extra-high effort): the final verification pass, code review of a worker's changes, conflict resolution between pieces.
- `subagent_type: "bug-hunter"` (extra-high effort, no source edits): hunting for bugs and diagnosing unexpected behavior.
- `subagent_type: "designer"` (max effort, no source edits): UI design pieces in Paper or another design tool the brief names. The brief must give a scratchpad directory for exported screenshots.

When the user asks for bug hunting (find bugs, deep dive for bugs, audit for bugs, why something refreshes, reloads, flickers, or breaks), every piece that looks for or diagnoses bugs goes to `bug-hunter`, never to `explorer`. An `explorer` may map the area first so the hunt briefs are sharper, but it does not judge whether something is a bug. Split the hunt by concern (for example data fetching, render and remount behavior, state, runtime reproduction) and launch the hunters in parallel. Fixes still go to `worker` or `worker-medium`, and the final verification pass still goes to `reviewer`.

Pick the worker per piece by difficulty, judged when you write the brief. Use `worker-medium` only for fully mechanical pieces, where the brief itself already contains the exact change: which files, which lines or symbols, and what they become, so the agent decides nothing. Examples: a fix a report pinned down to file and line, a rename, a config value, a copy or doc edit. Boilerplate that copies an existing pattern qualifies only when the brief names the pattern file and the new file's path. Everything else goes to `worker`: any piece that needs a design decision, spans modules, touches tricky logic (state, concurrency, caching, auth, data migrations), works in code nobody has mapped yet, or would be costly to get wrong. When unsure, use `worker`.

If a `worker-medium` reports the piece was harder than briefed, do not discard its work. Launch `worker` with the original brief, the `worker-medium` report, and an instruction to continue from the partial changes already on disk (review them, keep what holds up, fix or revert the rest) rather than starting over. If the `worker-medium` ran with `isolation: "worktree"`, give `worker` that worktree's path and branch.

For the built-in `Plan`, `code-reviewer`, `security-reviewer`, pass `model: "opus"`.

Launch independent pieces in one message, backgrounded. Size each piece so one run finishes it with a clear done state. Briefs must stand alone: goal, exact scope and out of scope, file paths, conventions, how to verify, and the report shape (done, verified how, unresolved). Workers do not reliably see the user's global CLAUDE.md, so paste the conventions that apply (style rules, commit rules, naming) into every brief instead of pointing at the file. Use SendMessage to continue an agent that already has context.

Parallel workers share one checkout and can overwrite each other's edits. Before launching pieces together, check that no two will change the same files. If they overlap, or you cannot tell, either run them one after another or launch each with `isolation: "worktree"`, tell each to commit its work in its worktree, and once both report, hand the branches to one agent to merge. Worktrees need a git repository; outside one, run overlapping pieces in sequence.

## End-to-end tests

Use [e2e](https://github.com/tester-army/e2e) for end-to-end work when the project already has an `e2e.config.ts` (or `e2e.config.mts`), or when the user asks for end-to-end tests. Do not add it to a project on your own: its agent steps call a model on the user's account. Agents learn it from the `e2e` skill (`npx skills add tester-army/e2e`) or from `npx e2e guide <topic>`, which prints the same text, so name the topic in each brief: `setup`, `writing-tests`, `explore`, `mcp`, `bug-bash`, or `debugging`.

- Setup is one `worker` piece: `npx e2e init`, a config whose target starts the app, and one passing test. Agents never sign in to a model provider or handle API keys. If no model credentials are configured, ask the user to export the provider's key or run `npx e2e login <provider>` themselves.
- A worker that changes a user-facing flow adds or updates `tests/<feature>.e2e.ts` and verifies with `npx e2e run <file>`.
- Bug hunts give each `bug-hunter` one charter. Hunters reproduce with `npx e2e explore "<charter>"` or by driving the live app through the `e2e` MCP server, and prove each confirmed bug with a repro test, at a path the brief names under `tests/bugbash/`, that fails for the reason reported. Before launching hunters in parallel, a `worker` prepares the bash as topic `bug-bash` describes: the app running once for every hunter, one seeded account per charter, and a bug-bash config. Every explore run spends model calls, so keep the number of charters proportional to the ask.
- The final `reviewer` pass runs `npx e2e run` over the tests that cover the change. Exit code 1 is a test failure; 2 to 4 are config, credential, or infrastructure errors, which go back to setup, not to a fix worker.
- Agents never run `npx e2e feedback`, which sends a report to the e2e team, unless the user asks.

## Integrate

Judge reports against the plan, not the agent's claim. Missing verification goes back to the agent. Conflicts between pieces go to one agent with both sides and a decision. Before reporting done, delegate a verification pass over the assembled result to `reviewer` and wait for it. Report only what was verified, in your own words, briefly: delegated, back, next, blocked.
