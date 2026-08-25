# Design Skills

Two agent skills for pixel-faithful design workflows. They chain: recreate a reference image as an editable mockup, refine it, then implement it in your codebase.

- **image-to-mockup** — recreate a design image (screenshot, exported frame, photo of a UI) as an editable mockup in Claude Design, generating all illustrations/icons/photos with Higgsfield using the source image as a style reference. Output is a design, not code. Requires Claude Design with Higgsfield available.
- **mockup-to-app** — implement a finished mockup in a real app codebase with pixel-level fidelity, reusing the codebase's components and tokens only where they don't change the pixels. Output is code. Works with any coding agent that supports SKILL.md skills (Claude Code and compatible agents).

Both skills treat the source as ground truth: no rounding odd values, no "fixing" typos, no swapping generated illustrations for library icons. Every deviation is flagged in a final report instead of silently shipped.

## Install

```
npx skills add rayentellissy/skills --list
npx skills add rayentellissy/skills --skill mockup-to-app
npx skills add rayentellissy/skills --skill image-to-mockup
```

## Usage

Attach a design image and ask to recreate it ("make this into an editable mockup"), or point the agent at a finished mockup and ask to implement it ("build this screen in my app, it needs to match exactly"). Each skill ends with a fidelity report listing what matched, what differs and why, and every assumption made.

## License

MIT — free for anyone to use, modify, and redistribute. See [LICENSE](LICENSE).
