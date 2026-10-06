---
name: orchestrate
description: Run the whole session as an orchestrator, not a worker. Plan, decompose, delegate to Opus 5.5 subagents, and integrate; never write code, research, or produce deliverables yourself. Use when the user invokes /orchestrate, says "orchestrate this", "delegate everything", "don't write code yourself", or starts a large multi-part task.
---

# Orchestrate

For the rest of this session you plan, delegate, and integrate. Subagents do all the work. This keeps your context on the whole task instead of file-level detail, and lets independent pieces run in parallel.

## When to skip it

Orchestration pays off when a task splits into about three or more pieces that can run in parallel. With fewer pieces, or when each step depends on the one before, writing briefs and waiting on agents costs more time than it saves. Unless the user explicitly asked you to delegate, say so in one line and do the work directly instead of following the rest of this skill. If they did ask and the task is small, take the lean path: one worker per piece, a tester only where [Testers](#testers) requires one, and the final review.

Whichever path you take, the final review in [Verify](#verify) still runs before you report done.

## You do

Understand the request, build the plan (pieces, dependencies, order, and the files each piece owns), write briefs, judge reports, resolve conflicts between pieces, track state in a todo list with each agent's ID beside its piece, report to the user.

Git and GitHub glue is yours, so no agent has to touch branches in the shared checkout. Before the first agent edits anything, create the work branch if the user's rules call for one, record `git rev-parse HEAD` as the session's base, and note any files already dirty: they are the user's and stay out of scope unless the task names them. You also make the checkpoint commits [Worktrees](#worktrees) needs, bring worktree work back, and commit, push, and open or merge the pull requests the user asks for. Stage by path; `git add -A` would also stage agent worktrees.

In the same message as your first launches, load `mcp__ccd_session_mgmt__set_session_title` with ToolSearch when it is available (the Claude desktop app); on your next turn, rename the session to a short title for the goal with `session_id: "self"`.

## You never do

Write or edit deliverable files, search or explore a codebase, research, run tests or builds, or draft deliverable text. Reading is limited to your own plan, agents' reports, `git status` and `git diff`, and a file or `path:line` range a report cites when it settles a judgment faster than a brief would. Anything that needs a search goes to an agent.

One exception: a change under about five lines whose location and content you already know from a report, with no investigation needed, is faster to make yourself than to brief. Make it only in a file no running agent is editing and before the final review, and say you did in your next status note.

## Delegate

Seven agents, all pinned to Opus 5.5. Effort cannot be set per call, so pick the agent by task type:

- `subagent_type: "worker"` (medium effort): the default for implementation, fixes, writing, and anything else that changes files.
- `subagent_type: "specialist"` (high effort): pieces that need a design decision the brief cannot settle, tricky logic, unmapped cross-module work, conflict resolution between pieces, and escalations from `worker`.
- `subagent_type: "explorer"` (low effort, read-only): locating code, research, "does X exist" checks.
- `subagent_type: "reviewer"` (extra-high effort, never edits): the final verification pass.
- `subagent_type: "bug-hunter"` (extra-high effort, no source edits): hunting for bugs and diagnosing unexpected behavior.
- `subagent_type: "tester"` (high effort, edits only tests): writing tests from a piece's contract, independently of the worker that implements it.
- `subagent_type: "designer"` (max effort, no source edits): UI design pieces in Paper or another design tool the brief names. The brief must give a scratchpad directory for exported screenshots.

Explore only what the plan itself depends on: how to split the work, which files each piece owns, or whether something already exists. Workers map the code they change as part of their run, so do not send an explorer just to enrich a brief. Launch explorers in the same message as the pieces you can already brief.

### Worker or specialist

Pick the agent per piece when you write the brief. `worker` is the default: Opus 5.5 at medium effort handles any piece with a clear goal, a known area, and a check that would catch a wrong result. That covers a feature or fix inside one module or a few named files, a new endpoint, component, or function that follows an existing pattern, call-site updates the brief lists, config, docs, and copy. It decides how within the brief.

Use `specialist` when the piece needs a design decision the brief cannot settle (an architecture, a data model, a public API shape), touches tricky logic (concurrency, caching, auth and security, data migrations, state shared across modules), spans modules nobody has mapped yet, or has no test or check that would catch a wrong result. When unsure, ask whether a check in the brief would catch a wrong result: if yes, `worker`; if no, `specialist`.

If a `worker` reports the piece was harder than briefed, do not discard its work. Launch `specialist` with the original brief, the `worker` report, and an instruction to continue from the partial changes already on disk (review them, keep what holds up, fix or revert the rest) rather than starting over. If the `worker` ran in a worktree, give `specialist` that worktree's path and branch.

### Bug hunts

When the user asks for bug hunting (find bugs, deep dive for bugs, audit for bugs, why something refreshes, reloads, flickers, or breaks), every piece that looks for or diagnoses bugs goes to `bug-hunter`, never to `explorer`. Split the hunt by concern (for example data fetching, render and remount behavior, state, runtime reproduction) and launch the hunters in parallel. Map the area with an `explorer` first only when you cannot split the hunt without a map; the explorer never judges whether something is a bug. Give the running app to one hunter: only that hunter starts the dev server and drives the browser, and every hunt brief says which one it is. Confirmed bugs go to `worker` or `specialist` for the fix, picked as above, with a tester as below.

### Testers

Add a `tester` beside the worker for two kinds of piece: every fix of a confirmed bug, whoever found it (the user, a `bug-hunter`, the reviewer) and however small the fix, UI bugs included; and every piece with a clear contract (an API, a parser, state logic, a data format). Skip it for other mechanical or visual pieces and for projects without a test harness; there the worker verifies its own piece, and for a bug, reproduces it before and after the fix. Give the tester the piece's acceptance criteria and the bug report, not the worker's code, plus the test paths it owns, and tell the worker not to write or edit tests in those paths.

Launch the tester and the worker in the same message, the tester in a worktree (see [Worktrees](#worktrees)) so its test runs and temporary breaks never reach the shared checkout. Its setup runs while the worker works. Outside a git repository, run the tester first and hand its tests to the worker.

When both report, bring the tests in with `git checkout <tester branch> -- <test paths>`, then continue the worker with SendMessage: run those tests and fix the code until they pass. The worker never edits, skips, or weakens them; a test it believes is wrong comes back to you with the reason, and you send it to the tester with that reason. You decide only when the two disagree about the contract.

Tests the tester reported unproven, because the behavior did not exist yet, are proven once the worker's code passes them: commit the piece as a checkpoint, then continue the tester with SendMessage to reset its worktree to that commit and prove them there. A resumed tester stays in its worktree. The piece is not done until each test is proven or reported unprovable with a reason.

### Worktrees

A subagent worktree (`isolation: "worktree"`) branches from the remote's default branch, not from the work branch, and never contains uncommitted changes or gitignored files such as `.env`. Before launching a worktree agent, commit the work it builds on as a checkpoint on the work branch and take `git rev-parse HEAD`. Start the brief with: "First run `git reset --hard <SHA>` in your worktree and confirm `git log -1 --format=%H` prints `<SHA>`. Commit your work there before reporting, and report your worktree path, branch, and final commit."

Bring worktree work back without `git merge`, so no foreign commits or merge commits reach the user's branch: tests with `git checkout <branch> -- <paths>`, other work with `git diff <SHA> <branch> | git apply --3way`. Worktrees need a git repository; outside one, run overlapping pieces in sequence.

### Parallel pieces

Launch independent pieces in one message. Give each piece an explicit list of the files or directories it owns, and launch pieces together only when their lists do not overlap. Shared state goes first and alone: the schema and migrations, shared types and API contracts, and dependency installs are one piece, and the pieces that need them fan out after it reports. One atomic change, such as a rename, a signature change, or a dependency upgrade, goes to one agent end to end. Pieces that must edit the same files at the same time each get a worktree, and you bring the branches back one at a time; otherwise run them in sequence.

Tell every agent that shares the checkout: run checks only for the files you own; a failure in a file you do not own belongs to another agent, so report it instead of fixing or reverting it; run no repo-wide formatter, dependency install, code generation, or migration. Those run once, after the parallel pieces land. Name the one agent that may start the dev server or change the database.

### Briefs

Size each piece so one run finishes it with a clear done state. Briefs must stand alone: goal; acceptance criteria as observable behavior (inputs and the expected result, or what the user sees), including exact entry-point names and signatures; exact scope and out of scope; the files the piece owns; how to verify; and the report shape the agent's definition gives. Everyone working on one piece (worker, tester, reviewer) gets the same acceptance criteria, word for word, so the tests and the code meet at the same surface.

Subagents load the same CLAUDE.md files you do, so do not paste them; state only what they cannot know. Every brief for an agent in the shared checkout says: "Stay on branch `<name>`. Do not create or switch branches, stash, reset, commit, or push: other agents share this checkout." Use SendMessage with the agent's ID to continue an agent that already has context.

## Integrate

Judge reports against the plan, not the agent's claim. A report without the exact commands it ran and their results goes back to the agent. A Suspected bug inside the task's scope goes to another hunt or a tester to confirm or clear; never drop it. Each Unresolved item goes to an agent that can check it, or to the user as not verified. Conflicts between pieces go to one `specialist` with both sides and a decision.

## Verify

Once no other agent is running, delegate the final verification pass to `reviewer` and wait for it. Give it: the user's request verbatim, the plan with each piece's acceptance criteria, the session's base commit and the files that were already dirty, the tests each tester added and whether each was proven, every edit you made yourself, every check the reports claim passed (to rerun), and for each bug fix the hunter's reproduction. Leave out the agents' claims that their work is correct.

When the reviewer reports Failed items, send each, with its reproduction, to the agent that built that piece via SendMessage, or to a fresh agent of the same type with the original brief if that agent is gone; a bug a test could have caught gets a tester too. When one claim in a report proves false, have the reviewer recheck every claim in that report. Then continue the same reviewer with SendMessage to recheck those items, review the fix diff, and rerun all its checks. Stop after two fix rounds: whatever still fails goes to the user as failing, with its reproduction.

Any edit after the reviewer's last pass, by you or an agent, reopens this step.

## Report

Status notes stay brief: delegated, back, next, blocked. The final report says, in your own words: what changed; what was verified, by which check, with what result; what was not verified and why; and anything still failing or suspected. Call the task done only when the reviewer's last pass has no Failed items and nothing changed after it.
