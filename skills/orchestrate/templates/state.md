# State file

Keep the run's state in `orchestrate-state.md` in your scratchpad directory, in this layout. Write "none" rather than leaving a field out, and update a field in the same message as the launch, report, or commit that changes it.

```text
Request: <the user's request, word for word>
Work branch: <name>
Base commit: <SHA>
Already dirty: <paths, or "none">

Standing orders:
1. <one rule per line, word for word as every brief carries it>

Pieces:
P1 <title, also its Agent description>
  Agent: <type>, <agent ID>, launched <time from `date`>, time limit <minutes>
  Status: <planned | running | done | partial | blocked | replaced by P1b>
  Owns: <paths>
  Adds to: <files, or "none">
  Acceptance criteria:
  - <word for word; every brief for this piece copies them from here>
  Worktree: <path, branch, and final commit, or "none">
  Tester: <agent ID, worktree, branch, test paths, and whether each test is proven, unproven, or unprovable, or "none">
  Claimed checks: <each command the report says passed, with its result>
  Outside edits: <each `path:line` and what it adds, from the report, or "none">
  Review group: <G1, or "none">

Review groups:
G1 <pieces>: checkpoint <SHA>, reviewer <agent ID>, Failed <items and who fixes each>, Suspected <items and who checks each>

Final pass: <checkpoint, reviewer IDs, fix rounds used of two>
Dismissed: <each item, the reason, and the quotes>
Unexplained paths: <changed paths no piece accounts for>
Orchestrator's edits: <each path and what changed>
```
