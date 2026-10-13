# Brief templates

Copy the template for the agent you are briefing and fill every field that applies; a field you cannot fill means the piece is not scoped yet. Drop the bracketed lines that do not apply, and the brackets from those that do. Copy acceptance criteria and standing orders from the state file word for word, and never pass on an agent's claim that its work is correct.

## Piece

For `worker`, `specialist`, `tester`, `bug-hunter`, `explorer`, and `designer`.

```text
[Worktree agent, first line] First run `git reset --hard <SHA>` in your worktree and confirm `git log -1 --format=%H` prints `<SHA>`. Commit your work there before reporting, and report your worktree path, branch, and final commit.
Goal: <the outcome, in one sentence>
Acceptance criteria:
- <observable behavior: inputs and the expected result, or what the user sees, with exact entry-point names and signatures>
Scope: <what is in>. Out of scope: <what is not>.
Owns: <the files or directories this piece may change>
Adds to: <files this piece may only add lines to, or "none">
Base commit: <the session's base SHA>
Verify: <the exact commands, or the flows to walk>
[Reads or writes stored data, or runs on every request] Scale: <row counts, request rate, payload size, as the user or the repository states them, or "unknown, assume production size">
Time limit: <minutes>
Standing orders:
1. <word for word>
[Shared checkout] Stay on branch `<name>`. Do not create or switch branches, stash, reset, commit, or push: other agents share this checkout. Run checks only for the files you own; a failure in a file you do not own belongs to another agent, so report it instead of fixing or reverting it. Run no repo-wide formatter, dependency install, code generation, or migration unless this brief assigns it. Only <you | the agent named> may start the dev server or change the database.
[Beside a tester] A tester owns <test paths>: do not write or edit tests there.
[Tester] You own <test paths>. <For a bug fix, the bug report.>
[Bug hunt] Hunt <the concern>. <You have the running app. | <hunter> has the running app: do not start a server or drive the browser.>
[Designer] Save exported screenshots to <a scratchpad directory>.
[Continuing an earlier agent's piece] Continue from the changes already on disk: review them, keep what holds up, and fix or revert the rest. Earlier brief: <...>. Earlier report: <...>. New work: <...>. <Worktree path and branch, if it ran in one.>
Report: the shape your agent definition gives.
```

## Reviews

For `reviewer`, one template per pass.

```text
Pass: group review
Branch: Stay on branch `<name>`. Do not create or switch branches, stash, reset, commit, or push.
Request: <the user's request, word for word>
Acceptance criteria: <each piece's, word for word>
Base commit: <SHA>
Paths: <the paths the group's pieces own>
Outside edits: <lines other pieces added in those paths, each with the piece that added it, or "none">
Tests: <each test the group's testers added, and whether it was proven>
Rerun: <every check the pieces' reports claim passed>
[Bug fix] Reproduction: <the hunter's reproduction>
Standing orders: <word for word>
Time limit: <minutes>
```

```text
Pass: code pass
Branch: Stay on branch `<name>`. Do not create or switch branches, stash, reset, commit, or push.
Request: <word for word>
Plan: <each piece with its acceptance criteria, word for word>
Base commit: <SHA>. Already dirty: <paths, or "none">
Reviewed groups: <for each, its owned paths, the checkpoint its last review read, and that review's Failed items with their reproductions>
Shared files: <each file more than one piece changed, with those pieces, or "none">
Unexplained paths: <changed paths no piece accounts for, or "none">
Tests: <each test the testers added, and whether it was proven>
Orchestrator's edits: <every edit the orchestrator made, or "none">
Rerun: <every check the reports of pieces outside the reviewed groups claim passed>
Reproductions: <the hunter's reproduction for each bug fix>
App pass alongside: <yes | no>
Standing orders: <word for word>
Time limit: <minutes>
```

```text
Pass: app pass
Branch: Stay on branch `<name>`. Do not create or switch branches, stash, reset, commit, or push.
Request: <word for word>
Plan: <each piece with its acceptance criteria, word for word>
Base commit: <SHA>
Flows: <the pieces that change what a user sees or clicks, and the flows to walk>
Reproductions: <the reproduction of each bug fix a user can see>
Standing orders: <word for word>
Time limit: <minutes>
```

```text
Pass: recheck
Branch: Stay on branch `<name>`. Do not create or switch branches, stash, reset, commit, or push.
Request: <word for word>
Acceptance criteria: <word for word>
Failed: <each Failed item from the final pass, with its reproduction>
Fix diff: git diff <previous checkpoint> <new checkpoint>
Rerun: <every check the previous pass ran>
[A claim in a fix report proved false] Recheck claims: <every claim in that report>
Flows: <the flows a user sees>
Standing orders: <word for word>
Time limit: <minutes>
```
