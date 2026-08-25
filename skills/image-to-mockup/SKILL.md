---
name: image-to-mockup
description: Recreate a design from an image (screenshot, mockup, photo of a UI, exported frame) as a pixel-faithful mockup in Claude Design, generating any illustrations, icons, or photos with Higgsfield using the source image as a style reference. Use this whenever the user attaches an image of a design and asks to recreate, rebuild, clone, replicate, copy, match, or "make this" — even if they don't say "mockup" or "pixel-perfect". Also use when the user says "use this as the source of truth", "match this exactly", or asks to turn a screenshot into an editable design. The output is an editable design mockup, not code — if the user wants the design implemented in an application codebase, use the mockup-to-app skill instead.
---

# Image to Mockup

The user has an image of a design and wants it back as an editable mockup that looks identical. The image is the source of truth. Your job is reproduction, not design: every deviation you introduce — a "cleaner" spacing, a "more standard" font size, a placeholder where an illustration should be — is a defect, even if it looks nicer in isolation. The user chose this image; respect it.

## Prerequisites

This skill needs Claude Design (to build the mockup) and Higgsfield (to generate assets). Confirm both are available before starting. If Claude Design is unavailable, stop and tell the user before analyzing anything. If Higgsfield is unavailable, do not substitute stock icons, redraw assets by hand, or leave placeholder boxes — complete steps 1–2 (the spec and asset inventory), then stop and hand the user the inventory with a note that asset generation needs Higgsfield connected, so no analysis work is lost.

If the user provides multiple images (several screens or states of the same product), give each image its own artboard on one canvas and run this workflow per image. Keep shared elements — nav, palette, type styles, repeated components — pixel-identical across artboards; measure them once and reuse the values.

## Workflow

Work in this order. Each step feeds the next, and skipping the inventory step is the most common cause of missed assets and misplaced elements.

### 1. Study the image before touching the canvas

Read the whole image first. Note the overall canvas size and aspect ratio, the grid or column structure, and the major regions (nav, hero, cards, footer, etc.). Then zoom into each region and record:

- **Layout and proportions** — position and size of every element relative to the canvas. Derive values proportionally, not by eye: fix the canvas width first (from image metadata or the user), then compute each element's size from the fraction of the canvas it spans — a card spanning 2/9 of a 1440px frame is 320px. When image-inspection tooling is available (crop, zoom, pixel measurement), use it. When a value can only be estimated, snap it to the nearest whole pixel, reuse that same value everywhere the element repeats, and mark it estimated in the report. Never re-estimate the same measurement twice — two inconsistent guesses are worse than one consistent one.
- **Spacing and alignment** — gaps, padding, margins, and which edges align with which.
- **Colors** — sample hex values directly from the image for backgrounds, text, borders, gradients (both stops), and shadows. Do not substitute "close enough" palette tokens. If no sampling tool is available, pick the closest hex you can name, reuse that exact value for every occurrence of the color, and mark it estimated in the report.
- **Typography** — family (or closest match if unavailable), weight, size, line height, letter spacing, case, and alignment for every distinct text style.
- **Corner radii, borders, shadows** — per element. Shadows include offset, blur, spread, color, and opacity.
- **Text content** — copy verbatim, including punctuation, capitalization, numbers, and any typos. Do not paraphrase or fix.
- **Opacity and blend effects** — translucent overlays, frosted panels, etc.

### 2. Inventory every graphic asset

List every illustration, icon, photo, logo, avatar, chart, texture, or decorative element that is not plain shapes/text. For each, record its bounding box (x, y, width, height), its aspect ratio, and whether it sits on a transparent, solid, or image background in the original.

Simple geometric shapes (rectangles, circles, lines, dividers) are built natively — they aren't assets. Everything else on this list gets generated in step 4. Never redraw these yourself, never substitute a stock icon set, and never leave a gray placeholder box.

### 3. Resolve ambiguity by asking, not guessing

If anything is unclear — text that's too small to read, an element cut off at the edge, a font you can't identify with confidence, whether a region is a photo or an illustration, a color that could be a gradient or a flat fill — stop and ask the user before building. Batch your questions into one message so the user isn't interrupted repeatedly. Guessing silently and moving on is the one thing the user explicitly does not want.

If the session is non-interactive and no one can answer, do not stall: proceed with the most literal reading of the image, apply each interpretation consistently throughout, and list every assumption under "Questions resolved" in the final report so the user can correct them afterward.

### 4. Generate assets with Higgsfield

For each asset in the inventory:

1. **Crop tightly** to that asset's bounding box in the source image. This crop is the reference — pass it (and the full image if it helps convey overall palette and lighting) to Higgsfield so the style, colors, lighting, subject, and rendering technique match the original rather than a generic interpretation.
2. **Generate at the exact aspect ratio** the asset occupies in the layout. Don't generate square and stretch.
3. **Request a transparent background** whenever the original asset sits directly on the page background (no card, no photo behind it). Only request an opaque background if the original clearly has one baked in.
4. **Check the result against the crop.** If subject, style, or palette drift, regenerate with a more specific prompt. Two or three attempts is normal; don't settle for "roughly similar" on the first try.

Keep a running log: asset name, reference crop used, generation prompt, aspect ratio, background setting. You'll need it for the final report.

### 5. Build the mockup

Construct the layout in Claude Design using the measurements from step 1. Place each generated asset at its exact recorded position and size — position first, then confirm dimensions, since scaled assets are easy to nudge off-center. Apply colors, type styles, radii, and shadows per element rather than via a simplified shared style unless the original actually uses one.

### 6. Section-by-section review — mandatory, not a glance

After building, review the mockup against the original image one section at a time (nav, hero, each card, footer, ...), not the whole canvas at once — whole-canvas comparisons hide small drift. For each section, in order:

1. Put the original image's section and the mockup's section side by side (overlay at reduced opacity if the tool allows).
2. Check every property from the step-1 spec: position, size, spacing, alignment, colors, type, radii, shadows, text, and each asset's presence, position, scale, and style.
3. Fix every difference found before moving to the next section. The bar is a 100% match — "close" is not done. If a section still differs after fixing, re-check it, don't average it out with the sections that pass.
4. Log the section as ✅ matched or note exactly what still differs and why.

While reviewing, **do not hesitate to generate more assets to close a gap.** If a region was built from shapes but doesn't match — a texture, a gradient mesh, a stylized element that native shapes can't reproduce — crop that region from the original and generate it with Higgsfield instead of settling. Same if a previously generated asset drifts in style, palette, or subject: regenerate it with a tighter reference crop and a more specific prompt, as many times as needed. Generating an extra asset is cheap; a visible mismatch is a defect. The only assets that shouldn't be generated are plain geometric shapes that already match exactly.

Only after every section is logged ✅ (or its remaining difference is named and justified, e.g. an unavailable font) does the mockup count as finished.

### 7. Report

End with a short report in this structure:

```
## Section review
- <section name> — ✅ matched / ⚠️ <exact remaining difference and why>

## Assets generated
- <asset name> — reference crop: <region / coordinates>, ratio <w:h>, transparent: yes/no

## Known differences
- <what couldn't be reproduced and why — e.g. font unavailable, substituted X; gradient mesh approximated with two-stop linear>

## Questions resolved
- <any ambiguities the user clarified, and what was chosen>
```

If there are no known differences, say so explicitly rather than omitting the section — the user is relying on this list to know where to double-check.

## Things that look like improvements but are defects

- Rounding an odd measurement (e.g. 17px padding) to a "nicer" number
- Swapping the original font for a more common one without flagging it
- Fixing a typo or grammar in the copy
- Replacing a specific illustration with a similar icon-library icon
- Normalizing inconsistent spacing across cards when the original is inconsistent
- Adding hover states, responsive behavior, or components that aren't in the image

If you think the original has a genuine mistake, reproduce it faithfully and mention it in the report. The user can decide.
