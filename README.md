# Skills

Agent skills for Claude Code and compatible agents.

## Design

Two skills for pixel-faithful design workflows. They chain: recreate a reference image as an editable mockup, refine it, then implement it in your codebase.

- **image-to-mockup** — recreate a design image (screenshot, exported frame, photo of a UI) as an editable mockup in Claude Design, generating all illustrations/icons/photos with Higgsfield using the source image as a style reference. Output is a design, not code. Requires Claude Design with Higgsfield available.
- **mockup-to-app** — implement a finished mockup in a real app codebase with pixel-level fidelity, reusing the codebase's components and tokens only where they don't change the pixels. Output is code. Works with any coding agent that supports SKILL.md skills (Claude Code and compatible agents).

Both skills treat the source as ground truth: no rounding odd values, no "fixing" typos, no swapping generated illustrations for library icons. Every deviation is flagged in a final report instead of silently shipped.

## Orchestration

- **orchestrate** — turns the session into an orchestrator for big tasks: it plans, decomposes, delegates every piece of code, research, and writing to Opus 5.5 subagents, then integrates and verifies. It never writes deliverables itself, which keeps the main context on the whole task and runs independent pieces in parallel. Every task ends with an independent review that diffs against the session's base, reruns every check the agents claim passed, and loops fixes back through the same reviewer. Ships with seven subagent definitions in `skills/orchestrate/agents/`, all pinned to Opus 5.5: `worker` (medium effort, the default for implementation), `specialist` (high effort, design decisions, tricky logic, and escalations from `worker`), `explorer` (low effort, read-only research), `reviewer` (extra-high effort, final verification, never edits), `bug-hunter` (extra-high effort, bug hunting that reproduces issues in the running app), `tester` (high effort, writes tests from the contract alongside the worker and proves each one can fail, edits only tests), `designer` (max effort, UI design in Paper or another design tool, no source edits). Copy them to `~/.claude/agents/` so the skill can delegate to them (if you are updating, delete the old `worker-medium.md` there), and install **test-audit** too, which `tester` preloads. Testers run in git worktrees, which do not get gitignored files: list files such as `.env` in a `.worktreeinclude` at the project root so their tests can run. Trigger with `/orchestrate` or "orchestrate this".

## Code quality

- **decomment** — audits comments in a diff or set of files. Removes narration, banners, commented-out code, and unproven workaround justifications. Keeps license headers, public API docs, issue links, and comments that explain non-obvious behavior a future reader would otherwise have to rediscover. Flags code that only makes sense because of a comment under `NEEDS REFACTOR` so it can be reshaped. Never edits application code; ends with a report of what was removed, kept, and flagged.
- **test-audit** — decides whether a test should exist, which kind to write, and what to do when one fails. Picks the test type from the behavior (property-based, integration, contract, component, end-to-end, regression), requires every new test to be seen failing against the behavior it names, and gates every new or changed test on four questions (what contract it protects, what regression fails it, why existing coverage misses it, whether it needs a test-only seam) plus a checklist of junk patterns such as assertions that can never fail, duplicated coverage, fakes that drift from the real code, and tests that depend on the real clock. Reviews the tests in a diff together with any test-only hooks it adds to production code, and never gets a failing test green by weakening it. In audit mode it sweeps existing tests, records evidence for each candidate, repairs the ones that guard a real contract, deletes the rest along with the test-only exports and dead code they kept alive, and treats a test that fails once it finally runs as a possible product bug.

## Install

```
npx skills add rayentellissy/skills --list
npx skills add rayentellissy/skills --skill mockup-to-app
npx skills add rayentellissy/skills --skill image-to-mockup
npx skills add rayentellissy/skills --skill orchestrate
npx skills add rayentellissy/skills --skill decomment
npx skills add rayentellissy/skills --skill test-audit
```

## Usage

Attach a design image and ask to recreate it ("make this into an editable mockup"), or point the agent at a finished mockup and ask to implement it ("build this screen in my app, it needs to match exactly"). Each skill ends with a fidelity report listing what matched, what differs and why, and every assumption made.

## License

MIT — free for anyone to use, modify, and redistribute. See [LICENSE](LICENSE).
