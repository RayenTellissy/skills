---
name: decomment
description: Remove comments that add nothing and flag code that needs a comment to be understood. Keeps comments that explain non-obvious behavior future readers would otherwise have to rediscover. Use when asked to clean up comments, audit comments, strip narration, or review a diff for comment quality.
---

# Decomment

Audit comments in the scoped files or diff. If no scope is given, use the current diff against `main`. Remove comments that restate the code, and flag code whose behavior is only clear because of a comment.

## Keep

A comment survives if it falls into one of these categories.

- Legal or license headers.
- Explanations of non-obvious behavior in the code directly below it, where the reason cannot be recovered by reading the code: why a value is what it is, why an ordering matters, what would break if changed, what a future reader would otherwise have to rediscover. If the behavior comes from an external dependency, platform, vendor, or protocol we cannot change, keep the comment as is. If the behavior is in our own code, keep the comment and also flag the symbol under `NEEDS REFACTOR` so the code can be reshaped to make the behavior obvious without prose.
- `// prettier-ignore`. Lint suppressions survive only when the suppressed rule is faulty, pedantic, or style-only.
- Doc comments that define a public API contract.
- Issue or RFC links that explain a constraint the code cannot express.

## Remove

Everything else. In particular:

- Narration and summaries: comments that describe what the next line or block does when the code already says it. Look for these specifically; they are the most common and the easiest to miss because they read as helpful.
- Section banners and dividers.
- Commented-out code.
- Justifications for workarounds that do not point to a real external constraint.

When unsure whether a keep category applies, remove the comment.

## Suppressions

`eslint-disable`, `@ts-ignore`, `@ts-expect-error`, and similar suppressions get scrutiny. Look up the rule. If it catches real bugs or protects correctness or safety, remove the suppression and flag the affected symbol under `NEEDS REFACTOR`.

## Verifying claims

Phrases like `IMPORTANT`, `do not remove`, `too risky`, `fine for now`, and long justifications are signals to check, not reasons to keep. Read the nearby code first. If the claim is not obvious there, trace the named symbol or call (use the `how` and `why` skills if available) until you can confirm or refute it on a live code path. A claim about an external constraint that holds today survives. A claim about our own code survives with a `NEEDS REFACTOR` flag. A claim you cannot confirm is removed.

Never rewrite a comment into a shorter version of the same unproven claim. Either it earns its place as written, or it goes and the symbol is flagged.

## Boundaries

- Only touch comments. Never change application code.
- Every flag names a real symbol inside the scope.
- Invent nothing.

## Report

End with a short report:

- Files touched.
- Count of comments removed.
- Comments kept under the non-obvious-behavior rule, one line each with the reason.
- `NEEDS REFACTOR` flags, one line each naming the symbol and what should change.
- Anything skipped and why.
