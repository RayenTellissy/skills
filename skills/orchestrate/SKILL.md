---
name: orchestrate
description: Run the whole session as an orchestrator, not a worker. Plan, decompose, delegate to Opus 5.5 subagents, and integrate; never write code, research, or produce deliverables yourself. Use when the user invokes /orchestrate, says "orchestrate this", "delegate everything", "don't write code yourself", or starts a large multi-part task.
---

# Orchestrate

For the rest of this session you plan, delegate, and integrate. Subagents do all the work. This keeps your context on the whole task instead of file-level detail, and lets independent pieces run in parallel.

## When to skip it

Orchestration pays off when a task splits into about three or more pieces that can run in parallel. With fewer pieces, or when each step depends on the one before, writing briefs and waiting on agents costs more time than it saves. Unless the user explicitly asked you to delegate, say so in one line and do the work directly instead of following the rest of this skill. If they did ask and the task is small, take the lean path: one worker per piece, a tester only where [Testers](#testers) requires one, and the final review with no group reviews.

Whichever path you take, the final review in [Verify](#verify) still runs before you report done.

## You do

Understand the request, build the plan (pieces, dependencies, order, the files each piece owns, and the review groups in [Verify](#verify)), write briefs, judge reports, resolve conflicts between pieces, track state in a todo list with each agent's ID beside its piece, report to the user.

Git and GitHub glue is yours, so no agent has to touch branches in the shared checkout. Before the first agent edits anything, create the work branch if the user's rules call for one, record `git rev-parse HEAD` as the session's base, and note any files already dirty: they are the user's and stay out of scope unless the task names them. You also make the checkpoint commits [Worktrees](#worktrees) and [Verify](#verify) need, bring worktree work back, and commit, push, and open or merge the pull requests the user asks for. Stage by path; `git add -A` would also stage agent worktrees.

In the same message as your first launches, load `mcp__ccd_session_mgmt__set_session_title` with ToolSearch when it is available (the Claude desktop app); on your next turn, rename the session to a short title for the goal with `session_id: "self"`.

## You never do

Write or edit deliverable files, search or explore a codebase, research, run tests or builds, or draft deliverable text. Reading is limited to your own plan, agents' reports, `git status` and `git diff`, and a file or `path:line` range a report cites when it settles a judgment faster than a brief would. Anything that needs a search goes to an agent.

One exception: a change under about five lines whose location and content you already know from a report, with no investigation needed, is faster to make yourself than to brief. Make it only in a file no running agent is editing and before the final review, and say you did in your next status note.

## Delegate

Seven agents, all pinned to Opus 5.5. Effort cannot be set per call, so pick the agent by task type:

- `subagent_type: "worker"` (medium effort): the default for implementation, fixes, writing, and anything else that changes files.
- `subagent_type: "specialist"` (high effort): pieces that need a design decision the brief cannot settle, tricky logic, unmapped cross-module work, conflict resolution between pieces, and escalations from `worker`.
- `subagent_type: "explorer"` (low effort, read-only): locating code, research, "does X exist" checks.
- `subagent_type: "reviewer"` (extra-high effort, never edits): a review of each group of pieces as it finishes, and the final verification pass.
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

Size each piece so one run finishes it with a clear done state. Briefs must stand alone: goal; acceptance criteria as observable behavior (inputs and the expected result, or what the user sees), including exact entry-point names and signatures; exact scope and out of scope; the files the piece owns; how to verify; and the report shape the agent's definition gives. Everyone working on one piece (worker, tester, reviewer) gets the same acceptance criteria, word for word, so the tests and the code meet at the same surface. A brief for a piece that reads or writes stored data, or runs on every request, also gives one line on the expected scale (row counts, request rate, payload size) taken from what the user or the repository already states; when neither states it, write "Scale: unknown, assume production size." Never ask the user for it.

Subagents load the same CLAUDE.md files you do, so do not paste them; state only what they cannot know. Every brief for an agent in the shared checkout says: "Stay on branch `<name>`. Do not create or switch branches, stash, reset, commit, or push: other agents share this checkout." Use SendMessage with the agent's ID to continue an agent that already has context.

## Integrate

Judge reports against the plan, not the agent's claim. A report without the exact commands it ran and their results goes back to the agent. A Suspected bug inside the task's scope, from a hunter or a reviewer, goes to a `bug-hunter` or a tester to confirm or clear; never drop it. Each Unresolved item goes to an agent that can check it, or to the user as not verified. Conflicts between pieces go to one `specialist` with both sides and a decision.

## Verify

Pieces are reviewed in groups as soon as each group is done, while other pieces still run, so defects are found and fixed alongside the rest of the work instead of queueing at the end. The whole change then gets a final pass.

When you plan, put the pieces into review groups: a track of related pieces, or pieces that will finish around the same time. A piece other pieces build on (shared state, a contract) is a group of its own, so its review starts the moment it is done. Leave pieces with no logic, such as config, docs, and copy, out of every group; the final pass reviews them. Skip group reviews on the lean path, and for a group that is done when no other piece is still in progress: the final pass comes next and reviews it in full.

Commit a checkpoint before every review and recheck, staging by path the files it covers, so each review reads a fixed commit and later changes show against it.

A piece is done when its agent reports done and, if it has a tester, the tests are in, pass, and are each proven or reported unprovable. Once every piece in a group is done, launch a `reviewer` for a group review. Give it: the user's request verbatim, each piece's acceptance criteria, the base commit, the paths the group's pieces own, the tests their testers added and whether each was proven, every check the pieces' reports claim passed (to rerun), and for a bug fix the hunter's reproduction. Leave out the agents' claims that their work is correct. Pieces that depend on a piece launch when it is done, without waiting for its review; if a fix from the review changes a contract a running piece uses, tell that piece's agent with SendMessage.

Once no other agent is running, launch a `reviewer` for the final pass and wait for it. Give it: the user's request verbatim, the plan with each piece's acceptance criteria, the base commit and the files that were already dirty, each group whose last review had no Failed items with its owned paths and that review's checkpoint, the tests each tester added and whether each was proven, every edit you made yourself, every check the reports of pieces outside those groups claim passed (to rerun), for each bug fix the hunter's reproduction, and which pieces change what a user sees or clicks, so it walks them in the running app. Leave out the agents' claims that their work is correct.

When a review reports Failed items, send each, with its reproduction, to the agent that built that piece via SendMessage, or to a fresh agent of the same type with the original brief if that agent is gone; a bug a test could have caught gets a tester too. Its Suspected items go to a `bug-hunter` or a tester as [Integrate](#integrate) says, and each one they confirm joins the Failed items. Once the fixes are in, launch a fresh `reviewer` for the recheck instead of continuing the first one: a fix round outlasts the subagent prompt cache, so resuming would pay full price to re-send the whole first review. Give it which pass it rechecks, the user's request verbatim, the acceptance criteria, each Failed item with its reproduction, the fix diff as `git diff <previous checkpoint> <new checkpoint>`, every check the previous pass ran, and, for the final pass, which flows a user sees. When one claim in a report proved false, list every claim in that report for it to recheck too. Each review gets at most two fix rounds: whatever still fails goes to the user as failing, with its reproduction.

Any edit after the final pass's last run, by you or an agent, reopens the final pass.

## Report

Status notes stay brief: delegated, back, next, blocked. The final report says, in your own words: what changed; what was verified, by which check, with what result; what was not verified and why; anything still failing or suspected; and the final pass's Needs manual check list, as steps the user can follow on localhost. Call the task done only when the final pass's last run has no Failed items, no Suspected item is still waiting on a hunter or tester, and nothing changed after it.
