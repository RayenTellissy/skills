# Skills

Agent skills for Claude Code and compatible agents.

## Design

Two skills for pixel-faithful design workflows. They chain: recreate a reference image as an editable mockup, refine it, then implement it in your codebase.

- **image-to-mockup** — recreate a design image (screenshot, exported frame, photo of a UI) as an editable mockup in Claude Design, generating all illustrations/icons/photos with Higgsfield using the source image as a style reference. Output is a design, not code. Requires Claude Design with Higgsfield available.
- **mockup-to-app** — implement a finished mockup in a real app codebase with pixel-level fidelity, reusing the codebase's components and tokens only where they don't change the pixels. Output is code. Works with any coding agent that supports SKILL.md skills (Claude Code and compatible agents).

Both skills treat the source as ground truth: no rounding odd values, no "fixing" typos, no swapping generated illustrations for library icons. Every deviation is flagged in a final report instead of silently shipped.

## Orchestration

- **orchestrate** — turns the session into an orchestrator for big tasks: it plans, decomposes, delegates every piece of code, research, and writing to Opus 5.5 subagents, then integrates and verifies. It never writes deliverables itself, which keeps the main context on the whole task and runs independent pieces in parallel. Ships with four subagent definitions in `skills/orchestrate/agents/`, all pinned to Opus 5.5: `worker` (medium effort, implementation), `explorer` (low effort, read-only research), `reviewer` (high effort, verification), `bug-hunter` (extra-high effort, bug hunting that reproduces issues in the running app). Copy them to `~/.claude/agents/` so the skill can delegate to them. Trigger with `/orchestrate` or "orchestrate this".

## Code quality

- **decomment** — audits comments in a diff or set of files. Removes narration, banners, commented-out code, and unproven workaround justifications. Keeps license headers, public API docs, issue links, and comments that explain non-obvious behavior a future reader would otherwise have to rediscover. Flags code that only makes sense because of a comment under `NEEDS REFACTOR` so it can be reshaped. Never edits application code; ends with a report of what was removed, kept, and flagged.
- **test-audit** — decides whether a test should exist and which kind to write. Picks the test type from the behavior (property-based, integration, contract, end-to-end, regression), requires every new test to be seen failing, and gates every new or changed test on four questions (what contract it protects, what regression fails it, why existing coverage misses it, whether it needs a test-only seam) plus a checklist of junk patterns such as assertions that can never fail, duplicated coverage, and source greps. In audit mode it sweeps existing tests, records evidence for each candidate before deleting anything, and removes the test-only exports and dead code those tests kept alive.

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
