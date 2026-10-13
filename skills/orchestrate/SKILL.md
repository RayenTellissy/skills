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

Understand the request, build the plan (pieces, dependencies, order, the files each piece owns, and the review groups in [Verify](#verify)), write briefs, judge reports, resolve conflicts between pieces, keep the run's [State](#state), report to the user.

Git and GitHub glue is yours, so no agent has to touch branches in the shared checkout. Before the first agent edits anything, create the work branch if the user's rules call for one, record `git rev-parse HEAD` as the session's base, and note any files already dirty: they are the user's and stay out of scope unless the task names them. You also make the checkpoint commits [Worktrees](#worktrees) and [Verify](#verify) need, bring worktree work back, and commit, push, and open or merge the pull requests the user asks for. Stage by path; `git add -A` would also stage agent worktrees.

In the same message as your first launches, load `mcp__ccd_session_mgmt__set_session_title` with ToolSearch when it is available (the Claude desktop app); on your next turn, rename the session to a short title for the goal with `session_id: "self"`.

## You never do

Write or edit deliverable files, search or explore a codebase, research, run tests or builds, or draft deliverable text. Reading is limited to your own plan and state file, this skill's templates, agents' reports, `git status` and `git diff`, and a file or `path:line` range a report cites when it settles a judgment faster than a brief would. Anything that needs a search goes to an agent.

One exception: a change under about five lines whose location and content you already know from a report, with no investigation needed, is faster to make yourself than to brief. Make it only in a file no running agent is editing and before the final review, and say you did in your next status note.

## State

Keep the run's state in `orchestrate-state.md` in your scratchpad directory, laid out as [templates/state.md](templates/state.md). Read that template and [templates/briefs.md](templates/briefs.md) once, before your first brief. Update the file in the same message as the launch, report, or commit it records, never in a turn of its own, and build every brief from it, copying acceptance criteria and standing orders word for word. After a compaction, read it before anything else.

Its standing orders are numbered lines, one rule each, for what every agent must follow that CLAUDE.md does not already say. Before your next launch, add a line whenever the user gives an instruction mid-session or a report turns up something every later agent needs, such as an environment variable the tests require or a command that hangs. Every brief carries them.

## Delegate

Seven agents, all pinned to Opus 5.5 with a fixed effort each. Pick the agent by task type, and leave the Agent tool's `model` and `effort` unset so each keeps its own:

- `subagent_type: "worker"` (medium effort): the default for implementation, fixes, writing, and anything else that changes files, plus the combined checks in [Verify](#verify).
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

When the tester reports, bring the tests in with `git checkout <tester branch> -- <test paths>`. If the worker is still running, tell it with SendMessage to run those tests before it reports and fix the code until they pass. If it has already reported, launch a new agent of its type with the original brief, its report, and the test paths to do the same. Whoever runs them never edits, skips, or weakens them; a test it believes is wrong comes back to you with the reason, and a new tester gets it with the original brief, the first tester's report, and that reason. You decide only when the two disagree about the contract.

Tests the tester reported unproven, because the behavior did not exist yet, are proven once the worker's code passes them: launch a new tester with the original brief, the first tester's report, its worktree path and branch, and the SHA of a checkpoint that holds the piece. Do not hold the group review for it: launch it in the same message as the piece's group review, on that review's checkpoint, or, when the piece gets no group review, commit a checkpoint and launch it as soon as the tests pass. It works in that worktree, so launch it without `isolation`; it resets the worktree to the checkpoint and proves the tests there. The piece is not done until each test is proven or reported unprovable with a reason.

### Worktrees

A subagent worktree (`isolation: "worktree"`) branches from the remote's default branch, not from the work branch, and never contains uncommitted changes or gitignored files such as `.env`. Before launching a worktree agent, commit the work it builds on as a checkpoint on the work branch, take `git rev-parse HEAD`, and open its brief with the template's worktree line for that SHA.

Bring worktree work back without `git merge`, so no foreign commits or merge commits reach the user's branch: tests with `git checkout <branch> -- <paths>`, other work with `git diff <SHA> <branch> | git apply --3way`. Worktrees need a git repository; outside one, run overlapping pieces in sequence.

### Parallel pieces

Launch independent pieces in one message. Give each piece an explicit list of the files or directories it owns, and launch pieces together only when their lists do not overlap. Shared state goes first and alone: the schema and migrations, shared types and API contracts, and dependency installs are one piece, and the pieces that need them fan out after it reports. One atomic change, such as a rename, a signature change, or a dependency upgrade, goes to one agent end to end. Pieces that must change the same files at the same time, beyond adding lines as below, each get a worktree, and you bring the branches back one at a time; otherwise run them in sequence.

A piece may still add a line it needs to a file it does not own, such as an import, an export, or a route or registry entry, under the rules in its agent definition, and its report lists each one. A file several pieces will add to (a route table, an index file, a registry) gets at most one owner, the piece that changes its existing lines, and the other briefs name it under Adds to.

Every agent that shares the checkout gets the template's shared-checkout line. The formatter, dependency install, code generation, and migration it rules out run once, after the parallel pieces land. Name the one agent that may start the dev server or change the database.

### Briefs

Size each piece so one run finishes it with a clear done state. Write each brief from [templates/briefs.md](templates/briefs.md), filling every field that applies: a field you cannot fill means the piece is not scoped yet. Briefs must stand alone. Everyone working on one piece (worker, tester, reviewer) gets the same acceptance criteria, word for word, so the tests and the code meet at the same surface. Take the Scale line from what the user or the repository already states, and never ask the user for it. Set each time limit to about twice what you expect the piece to take.

Subagents load the same CLAUDE.md files you do, so do not paste them; state only what they cannot know.

An agent that has reported is finished: never resume it. Its prompt cache expires a few minutes after it stops, so resuming it pays full price to re-send its whole context. Hand any further work on its piece to a new agent of the same type with the original brief, the earlier agent's report, and the new work. If the earlier agent ran in a worktree, give the new one that worktree's path and branch and launch it without `isolation`. SendMessage is only for an agent that is still running, such as telling it about a contract change it has to follow.

## Integrate

Judge reports against the plan, not the agent's claim. A report without the exact commands it ran and their results counts as unverified: give the piece to a new agent of the same type, as [Briefs](#briefs) says, to run those checks and report them. A Suspected bug inside the task's scope, from a hunter or a reviewer, goes to a `bug-hunter` or a tester to confirm or clear unless you dismiss it as below; launch the checks for one report's Suspected items in one message, one agent per group of related items, so they run in parallel. Each Unresolved item goes to an agent that can check it, or to the user as not verified. Conflicts between pieces go to one `specialist` with both sides and a decision.

Dismiss a Failed or Suspected item instead of fixing or checking it only when it is in code the change did not touch and does not expose (the final report lists it as found but not fixed), when it asks for behavior the user's request or the acceptance criteria rule out (quote the item and the words that rule it out), or when it repeats another item. Never dismiss one because the fix looks costly or because an agent says the code is right. Record each dismissal and its reason in the state file.

After each report, compare `git status --short` with the state file. A changed path that no piece owns, no report lists as an outside edit, and was not already dirty, agent worktrees aside, goes into the state file as unexplained; the final code pass reviews in full each one still unexplained.

An agent that errors, runs out of context, or stops at its time limit gets one replacement: a new agent of the same type with the original brief, its report if any, and an instruction to continue from what is on disk. If the replacement fails the same way, a `worker` piece goes to `specialist` as [Worker or specialist](#worker-or-specialist) says, and any other piece is blocked; so is a piece whose `specialist` reports it blocked. Say in your next status note that the piece is blocked and why, stop work on it and on the pieces that depend on it, and finish the rest. Each time you wake, compare `date` with the launch times in the state file: stop any agent past twice its time limit with `TaskStop` (load it with ToolSearch) and treat it as stopped at its time limit.

When a report shows a failure every agent would hit, such as a broken test command, dev server, database, or shared contract, launch nothing new until one agent has fixed it, and tell the running agents with SendMessage to skip that check and report it as not run.

## Verify

Pieces are reviewed in groups as soon as each group is ready, while other pieces still run, so defects are found and fixed alongside the rest of the work instead of queueing at the end. The whole change then gets a final pass. Every review brief comes from [templates/briefs.md](templates/briefs.md) and leaves out the agents' claims that their work is correct.

When you plan, put the pieces into review groups: a track of related pieces, or pieces that will finish around the same time. Pieces launched together in one message form one group unless you expect one to run far longer than the rest, so they get one review, not one each. A piece other pieces build on (shared state, a contract) is a group of its own, so its review starts the moment it is ready. Leave pieces with no logic, such as config, docs, and copy, out of every group; the final pass reviews them. Skip group reviews on the lean path, and for a group that is ready when no other piece with logic is still in progress (docs, config, and copy pieces still running do not count): the final pass comes next and reviews it in full.

Commit a checkpoint before every review and recheck, staging by path the files it covers, so each review reads a fixed commit and later changes show against it.

A piece is ready when its agent reports done and, if it has a tester, the tests are in and pass; it is done once each of those tests is also proven or reported unprovable. Once every piece in a group is ready, commit the group's checkpoint and launch everything that reads it in one message: a `reviewer` for the group review, the testers that prove its unproven tests (see [Testers](#testers)), a combined check, and the group's app pass when it gets one. The review's brief names each running piece whose Adds to includes the group's paths, since lines that piece has added there so far are its unfinished work: a failure the review files against it waits for its report, and the final code pass reviews those lines in full. Pieces that depend on a piece launch when it is ready, without waiting for its proofs or review; if a fix from the review changes a contract a running piece uses, tell that piece's agent with SendMessage.

The combined check is a `worker` in a worktree at the group's checkpoint that runs the repository's type check and tests over the whole tree and changes nothing, so a break between pieces shows up while the rest still run instead of in the final pass. Where those tests would share a database, fixed ports, or timing-sensitive suites with running agents, it runs the type check only. Hand each failure it reports to a new agent of the type that built the piece whose change caused it, or to one `specialist` with both sides when it sits between two pieces; a failure it traces to a running piece's unfinished work waits for that piece's report. Never pass its result to a reviewer: the final pass reruns every check.

A group whose pieces change what a user sees or clicks gets its own app pass, a second `reviewer` that walks the group's flows in the running app so UI defects are fixed alongside the remaining work. Launch it only when no running agent may start the dev server or change the database, and name it that agent until it reports; otherwise the group's flows wait for the final app pass, which walks every flow either way.

Once no other agent is running, launch the final pass and wait for it. It is a `reviewer` for the code pass and, when any piece changes what a user sees or clicks, a second `reviewer` for the app pass, launched in the same message so the app walk runs alongside the code review instead of after it. When the plan has three or more review groups, split the code pass across two or three reviewers in that message so no single review sets the pace: give each a share of the groups with the seams where they call into the rest, give each path outside every group, unexplained path, outside edit a group review left to a running piece, and shared file to exactly one of them, and name one to run the repository's checks. The final pass is done when all of them have reported.

When a review reports Failed items, hand each one you do not dismiss (see [Integrate](#integrate)), with its reproduction, to a new agent of the type that built that piece (for an outside edit, the piece that added the line), as [Briefs](#briefs) says; a bug a test could have caught gets a tester too. Its Suspected items go to a `bug-hunter` or a tester as [Integrate](#integrate) says, and each one they confirm joins the Failed items. Fixes from a group review, its app pass, or its combined check get no separate recheck: the final pass rechecks each of their Failed items, reruns every check, and reviews everything changed in the group's paths since its checkpoint in full. Once the final pass's fixes are in, launch a new `reviewer` for the recheck. The final pass gets at most two fix rounds: whatever still fails goes to the user as failing, with its reproduction.

Any edit after the final pass's last run, by you or an agent, reopens the final pass.

## Report

Status notes stay brief: delegated, back, next, blocked. The final report says, in your own words: what changed, including any change no piece accounted for; what was verified, by which check, with what result; what was not verified and why; anything still failing, suspected, or blocked; each finding you dismissed, with its reason; and the final pass's Needs manual check list, as steps the user can follow on localhost. Call the task done only when the final pass's last run has no Failed items, no Suspected item is still waiting on a hunter or tester, and nothing changed after it.
