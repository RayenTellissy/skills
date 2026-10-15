# Brief templates

Copy the template for the agent you are briefing and fill every field that applies; a field you cannot fill means the piece is not scoped yet. Drop the bracketed lines that do not apply, and the brackets from those that do. Copy acceptance criteria and standing orders from the plan file word for word into piece briefs. Combined-check and review briefs point to the plan file by its full path instead, so copy no request, standing orders, or acceptance criteria into them. Never pass on an agent's claim that its work is correct.

## Piece

For `worker`, `specialist`, `tester`, `bug-hunter`, `explorer`, and `explainer`.

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
Principles: <full path to principles.md>
[Works in an explained area] Explanations: <the path of each how or why explanation covering this piece's area>. Read each in full before any work.
[Piece runs a playbook step] Playbook: <the playbook's name, its bold opening line and rule paragraphs, and the steps this agent carries, word for word, with each pstack name read as the skill's Playbooks section says>
Standing orders:
1. <word for word>
[Shared checkout] Stay on branch `<name>`. Do not create or switch branches, stash, reset, commit, or push: other agents share this checkout. Run checks only for the files you own; a failure in a file you do not own belongs to another agent, so report it instead of fixing or reverting it. Run no repo-wide formatter, dependency install, code generation, or migration unless this brief assigns it. <Only you | Only <the agent named> | No agent> may start the dev server or change the database.
[Beside a tester] A tester owns <test paths>: do not write or edit tests there. <If its tests are already in: Run them before you report, and fix the code until they pass.>
[Tester] You own <test paths>. <For a bug fix, the bug report.>
[Bug hunt] Hunt <the concern>. <You have the running app. | <the agent named> has the running app: do not start a server or drive the browser.>
[Runs a how or why template] Template: <its full path under how/ or why/>, with its placeholders filled in: <each placeholder and its value, word for word>
[Explainer] Output: <the scratchpad file to write the explanation to>
[Builds against a sketch] Sketch: <your sketch and rationale paths>. The synthesized sketch is the contract. Deviations from it are signal to surface under Decisions, not friction to absorb silently.
[Continuing an earlier agent's piece] Continue from the changes already on disk: review them, keep what holds up, and fix or revert the rest. The earlier agent's brief was this one except for <its Goal, and any other field that differed>. Its report: <...>. New work: <...>. <Worktree path and branch, if it ran in one.>
Report: the shape your agent definition gives.
```

## Combined check

For the `worker` launched beside a group review, in a worktree.

```text
First run `git reset --hard <the group's checkpoint SHA>` in your worktree and confirm `git log -1 --format=%H` prints it. Change no source or test file, and commit nothing.
Goal: run the repository's type check and tests on this checkpoint and report every failure.
Plan: <full path to orchestrate-plan.md>. Its standing orders bind you, and its pieces' Owns and Adds to say which piece owns each path. If you cannot read it, stop and report that.
Run: <the exact commands>. If the tests would share a database, fixed ports, or timing-sensitive suites with running agents, run the type check only and say so.
Setup: run the dependency install and code generation these checks need, in your worktree only.
Running pieces: <each piece still running, by its number in the plan, or "none">
Time limit: <minutes>
Principles: <full path to principles.md>
Report: the shape your agent definition gives. Under Verified, give each failure's command, failing path, and error or test, with the piece whose change caused it, or both pieces when it sits between two. A failure a running piece's unfinished work could explain goes under Not verified, naming that piece.
```

## Reviews

For `reviewer`, one template per pass.

```text
Pass: group review
Branch: Stay on branch `<name>`. Do not create or switch branches, stash, reset, commit, or push.
Plan: <full path to orchestrate-plan.md>. Its request and standing orders, and the acceptance criteria of <the group's pieces>, are this brief's.
Base commit: <SHA>
Paths: <the paths the group's pieces own>
Outside edits: <lines other pieces added in those paths, each with the piece that added it, or "none">
Running pieces: <each piece still running whose Adds to includes these paths: its number in the plan and those files, or "none">
Tests: <each test the group's testers added, and whether it is proven, unprovable, or being proven alongside this review>
Rerun: <every check the pieces' reports claim passed, and the Verify commands of any piece whose report gave none, marked never run>
[Bug fix] Reproduction: <the hunter's reproduction>
Time limit: <minutes>
Principles: <full path to principles.md>
[Reviews an explained area] Explanations: <the path of each how or why explanation covering the paths under review>. Read each in full before reviewing.
```

```text
Pass: code pass
Branch: Stay on branch `<name>`. Do not create or switch branches, stash, reset, commit, or push.
Plan: <full path to orchestrate-plan.md>. Its request, standing orders, and every piece's acceptance criteria are this brief's.
Base commit: <SHA>. Already dirty: <paths, or "none">
[Split code pass] Share: <the groups you cover and the seams where they call into other groups>. The fields below list only your share. Repository checks: <yours | <reviewer> runs them, so run no repository-wide tests, type check, lint, or build>.
Reviewed groups: <for each, its owned paths, the checkpoint its last review read, and that review's Failed items with their reproductions, or that its review is still running>
Shared files: <each file more than one piece changed, with those pieces, or "none">
Unexplained paths: <changed paths no piece accounts for, or "none">
Outside edits: <each outside edit a group review left to a running piece, with the piece that added it, or "none">
Tests: <each test the testers added, and whether it is proven, unprovable, or being proven alongside this pass>
Orchestrator's edits: <every edit the orchestrator made, or "none">
Rerun: <every check the reports of pieces outside the reviewed groups claim passed, and the Verify commands of any such piece whose report gave none, marked never run>
Reproductions: <the hunter's reproduction for each bug fix>
App pass: <alongside you | after <the agent that has the dev server> reports | none>
Time limit: <minutes>
Principles: <full path to principles.md>
[Reviews an explained area] Explanations: <the path of each how or why explanation covering the paths under review>. Read each in full before reviewing.
```

```text
Pass: app pass
Branch: Stay on branch `<name>`. Do not create or switch branches, stash, reset, commit, or push.
Plan: <full path to orchestrate-plan.md>. Its request, standing orders, and every piece's acceptance criteria are this brief's.
Base commit: <SHA>
[Group app pass] Groups: <the groups it covers, with their paths>. Other agents may still edit the checkout. You are the one agent that may start the dev server or change the database until you report.
Flows: <the pieces that change what a user sees or clicks, and the flows to walk>
Reproductions: <the reproduction of each bug fix a user can see, and in the final pass each Failed item a group's app pass reported that has been fixed since>
Time limit: <minutes>
Principles: <full path to principles.md>
[Reviews an explained area] Explanations: <the path of each how or why explanation covering the paths under review>. Read each in full before reviewing.
```

```text
Pass: recheck
Branch: Stay on branch `<name>`. Do not create or switch branches, stash, reset, commit, or push.
Plan: <full path to orchestrate-plan.md>. Its request and standing orders, and the acceptance criteria of <the pieces the fixes changed or the group to review in full>, are this brief's.
Failed: <each Failed item this fix round fixed, with its reproduction, or "none">
Fix diff: <git diff <previous checkpoint> <new checkpoint>, or "none">
Rerun: <every check the previous pass ran>
[A claim in a fix report proved false] Recheck claims: <every claim in that report>
[A group review alongside the final pass never reported] Review in full: <the group and its paths>
Flows: <the flows a user sees>
Time limit: <minutes>
Principles: <full path to principles.md>
[Reviews an explained area] Explanations: <the path of each how or why explanation covering the paths under review>. Read each in full before reviewing.
```
