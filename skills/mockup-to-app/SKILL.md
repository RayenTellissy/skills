---
name: mockup-to-app
description: Implement a finished mockup (from Claude Design, Figma export, or a design image) in a real application codebase with pixel-level fidelity — the built screen must look exactly like the mockup. Use this whenever the user asks to implement, build, code up, port, or "make real" a design or mockup, integrate a designed screen into their app, or says the result "needs to match the design exactly". Also use for follow-up requests to fix visual differences between an implemented screen and its mockup. The output is code in a codebase — if the user wants a design image turned into an editable design mockup instead, use the image-to-mockup skill.
---

# Mockup to App

The user has an approved mockup and wants it in their real app, looking identical. The mockup is the source of truth for everything visual. The codebase is the source of truth for everything structural: framework, styling system, component library, naming, file layout. Your job is to make the two meet without compromising the first.

The ranking when they conflict: **visual fidelity beats code conventions.** Reuse the app's existing button component if it can be made to render exactly like the mockup's button; if it can't (and its API doesn't allow overriding the difference), build a variant or a new component rather than shipping a button that's 2px off. Note every such decision for the final report.

## Workflow

### 1. Extract a complete spec from the mockup

Before writing code, turn the mockup into an explicit spec. If the mockup came from the image-to-mockup skill, much of this already exists — reuse those measurements rather than re-deriving them. Record per element:

- Position, size, and how it should behave when the container resizes (the mockup is one snapshot; ask the user how it should adapt — see step 3)
- Spacing: padding, margins, gaps — exact values, not approximations
- Colors as exact hex/rgba values, including gradients (all stops) and shadow colors
- Typography: family, weight, size, line height, letter spacing, case, alignment
- Corner radii, borders, shadows (offset, blur, spread, color, opacity)
- All text content verbatim
- Every image/illustration/icon asset, with its export from the mockup

Export raster assets at 1x and 2x (or the platform's convention); export icons and simple illustrations as SVG when the mockup tool allows, since they scale cleanly. Never re-create an asset by hand or substitute a library icon for a generated one.

**Assets always come from the mockup — including when updating an existing screen.** The "reuse what's in the codebase" rule below applies to components, tokens, and code structure, never to icons, illustrations, photos, or logos. If the app already has an icon in the spot where the mockup shows a different (or restyled) one, the mockup's version replaces it. Do not keep an existing asset because it's "close enough", already imported, or part of the app's icon set: compare each asset in the mockup against what's currently rendered, and export-and-swap every one that differs. If two assets genuinely look identical, keeping the existing file is fine — but that's a visual judgment made by comparing them, not a default.

### 2. Read the codebase before writing anything

Spend real effort here — this is what "without losing consistency" means on the code side:

- Identify the framework, styling approach (Tailwind, CSS modules, styled-components, SwiftUI modifiers, etc.), and build/asset pipeline. Implement in that system, not your favorite one.
- Find the design tokens (colors, spacing scale, type scale). Map mockup values onto existing tokens **only where they match exactly**. A mockup color of `#2563EB` maps to `--color-primary` if that token is `#2563EB`; if the token is `#2E6BE6`, use the literal value and flag the mismatch to the user — they may want to update the token or the mockup, but that's their call.
- Find existing components that correspond to elements in the mockup (buttons, cards, inputs, nav). Check their rendered output against the spec, prop by prop, before reusing them.
- Note routing, page scaffolding, and where new screens live, so the new code lands where a teammate would expect it.
- **If the mockup updates an existing screen**, diff the current screen against the mockup element by element and list what changes — layout, styles, copy, and especially assets. The existing implementation is *not* a source of truth for anything the mockup changed; it only tells you where the code lives. Treat every icon and image on the existing screen as suspect until you've confirmed it matches the mockup's version.

### 3. Ask about what the mockup can't tell you

A mockup is one static frame. Before or during implementation, ask the user (batched into one message) about anything the frame doesn't specify: responsive behavior and breakpoints, hover/focus/pressed/disabled states, empty and loading and error states, scroll behavior, animations, and which parts are real data vs. hardcoded copy. Implement what they answer; for anything they say "doesn't matter", keep it minimal and note it in the report. Never invent elaborate states that aren't in the mockup — unrequested polish is drift.

If the session is non-interactive and no one can answer, implement the minimal reasonable default for each unspecified behavior, apply the same choice consistently across the screen, and list every one under "Unspecified behavior" in the final report so the user can revise them.

### 4. Implement region by region

Build in the mockup's visual order (outer layout first, then each region), checking against the spec as you go rather than all at the end. Use exact values from the spec; resist rounding 17px to 16px because the spacing scale prefers it — if the mockup says 17, the screen says 17. Place exported assets through the app's normal asset pipeline with proper sizing so they render at the mockup's dimensions.

Pixel fidelity is about rendered output, not markup structure: use semantic elements, headings, labels, alt text, and a sane focus order as the platform expects. Accessibility structure doesn't change a single pixel and is required — skipping it is not fidelity, it's just worse code.

### 5. Verify pixel fidelity

"Looks about right" is not the bar. Verify:

1. Render the implemented screen at the mockup's exact canvas size.
2. Take a screenshot and compare it side by side with the mockup — ideally overlay them (e.g. 50% opacity difference view) if tooling allows.
3. Walk region by region checking: text wrapping, font rendering weight/size, spacing drift, color accuracy, asset position and scale, radii and shadows.
4. Fix differences and re-compare. Iterate until the only remaining differences are ones you can name and justify (e.g. platform font rendering, unavailable font).

If you have no way to render and screenshot in the current environment, say so explicitly and give the user a concrete checklist of what to compare when they run it — do not silently skip verification.

### 6. Report

End with:

```
## Fidelity report
- Verified identical: <regions confirmed pixel-matching, and how you verified>
- Known differences: <each one, why, and what would resolve it>

## Assets
- Swapped: <existing app assets replaced by mockup exports>
- Kept: <existing assets confirmed visually identical to the mockup's>
- Added: <new assets exported from the mockup>

## Consistency decisions
- Reused: <existing components/tokens used, and any props/variants added>
- New: <components/styles created because nothing existing could match, and why>
- Token mismatches flagged: <mockup value vs. existing token, awaiting user decision>

## Unspecified behavior
- <states/breakpoints the mockup didn't define and what was implemented, per user's answers or minimal defaults>
```

## Things that look like improvements but are defects

- Snapping mockup values to the design system's scale when they differ
- Swapping a generated illustration for an icon-library equivalent
- Keeping an existing screen's old icon or image when the mockup shows a different one, because it's already wired up
- "Fixing" copy, capitalization, or typos present in the mockup
- Adding transitions, hover effects, or responsive reflows the user didn't ask for
- Refactoring unrelated code you happened to touch

If the mockup itself seems to contain a mistake, implement it faithfully and raise it in the report — the user decides.
