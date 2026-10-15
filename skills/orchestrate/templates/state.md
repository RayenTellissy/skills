# State files

Keep the run in two files in your scratchpad directory, in these layouts. Write "none" rather than leaving a field out, and update a field in the same message as the launch, report, or commit that changes it.

`orchestrate-plan.md` holds what review and combined-check briefs point their agents to, so it never holds an agent's claim, a status, or a dismissal.

```text
Request: <the user's request, word for word>

Playbook: <the matched playbook, or "none">
1. <each step word for word, then the piece or agent that carries it, or `skip: <reason>`>

Explanations: <each how or why explanation's path and the area it covers, or "none">
Sketch: <the paths of your architect sketch and rationale, or "none">

Standing orders:
1. <one rule per line, word for word as every brief carries it>

Pieces:
P1 <title, also its Agent description>
  Owns: <paths>
  Adds to: <files, or "none">
  Playbook: <its own playbook and steps, laid out as above, when it differs from the request's, or "none">
  Verify: <the exact commands, or the flows to walk>
  Acceptance criteria:
  - <word for word; every brief for this piece copies them from here>
```

`orchestrate-state.md` holds the rest, and only you read it.

```text
Work branch: <name>
Base commit: <SHA>
Already dirty: <paths, or "none">
Dev server and database: <the agent that may start the dev server or change the database, and the agents waiting for them, or "none">

Pieces:
P1 <title>
  Agent: <type>, <agent ID>, launched <time from `date`>, time limit <minutes>
  Status: <planned | running | ready | done | partial | blocked | replaced by P1b>
  Worktree: <path, branch, and final commit, or "none">
  Tester: <agent ID, worktree, branch, test paths, and whether each test is proven, unproven, or unprovable, or "none">
  Claimed checks: <each command the report says passed, with its result>
  Outside edits: <each `path:line` and what it adds, from the report, or "none">
  Review group: <G1, or "none">

Review groups:
G1 <pieces>: checkpoint <SHA>, reviewer <agent ID>, combined check <agent ID>, app pass <agent ID, waiting for <agent ID>, or "none">, running pieces named <pieces, or "none">, Failed <items and who fixes each>, Suspected <items and who checks each>

Playbook steps: <each step's number in the plan and whether it is pending, running, or done>
Final pass: <checkpoint, each reviewer's ID and share, the agents running alongside it, items held for the fix round, fix rounds used of two>
Dismissed: <each item, the reason, and the quotes>
Unexplained paths: <changed paths no piece accounts for>
Orchestrator's edits: <each path and what changed>
```
