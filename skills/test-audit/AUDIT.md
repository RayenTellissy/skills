# Audit mode

Focused sweeps for existing tests that match the [junk patterns](SKILL.md#junk-patterns) and the test-only seams they keep alive. Optimize for confidence, not deletion count.

## 1. Discover

Keep discovery read-only. For broad scope, split the sweep into parallel lanes when available: one per top-level area (for example app code, shared packages, plugins or integrations, scripts and tooling) plus one cross-cutting junk-pattern sweep. Each lane returns ledger entries in the format below.

For a normal audit, prefer a few high-confidence candidates over a large speculative inventory. When asked to prune a whole module or subsystem, inventory every test file it owns, but still edit only candidates with complete ledgers.

Before judging a candidate, read the complete test and its owner: entry point, callers, callees, sibling implementations, overlapping tests, CI routing (which test config and CI job run the file), and history. When the test claims dependency-backed behavior, inspect the dependency source or types directly.

## 2. Record the ledger

Fill every field before editing; a missing field means the candidate is not ready for deletion. **Detects**, **Stronger proof**, and **Seam callers** are the authoring gate asked of an existing test.

- **Test**: exact name and `path:line`.
- **Detects**: the failure it can actually catch, and the contract behind it.
- **Stronger proof**: the primary test that still covers that failure, or why no proof is needed.
- **Seam callers**: non-test callers of the production or support seam it covers.
- **History**: why the test or seam exists (`git log --follow -- <test>`, `git log -S <seam>`).
- **Unlocks**: production or test-support code the removal lets you delete.
- **Risk and check**: what could break, and the focused validation command.

Report the ledger before editing. Edit only when the request asked for cleanup, not just a review.

## 3. Edit

Choose one coherent owner-boundary batch. Delete obsolete test-only exports, globals, wrappers, and dead production paths instead of preserving aliases. Move retained regressions to the owner boundary's tests. Consolidate repeated package or dependency assertions into one generic contract.

Prefer net-negative production LOC. Do not add replacement tests that restate the same implementation, and do not convert uncertain candidates into cleanup to raise the deletion count.

## 4. Validate

Never edit source or tests while a test run is in progress in the same checkout. Use the project's own commands from its instruction files or package scripts.

1. Run the smallest set of owner and sibling tests.
2. For removed source greps, run the script, build, or dry run that owns the real contract.
3. Format the changed files, then run `git diff --check`.
4. Run the checks the repository requires for the changed paths, such as lint, typecheck, and affected tests.
5. Inspect `git diff --numstat`; report production and tooling separately from tests and test support.
6. Review the final diff before handing off, with a code-review skill if one is available.

## 5. Land

Commit, push, open a PR, or merge only when authorized, following the repository's PR flow. Land one coherent PR at a time, then refresh from the base branch.

Start another batch only when the request covers it and fresh read-only discovery finds candidates with complete ledgers. Otherwise stop and list the remainder as named follow-ups.

## 6. Hand off

Report:

- why the removed tests existed, and which junk-pattern groups were removed;
- production owner simplifications;
- retained false positives and why they remain valuable;
- focused and full proof actually run;
- production versus test LOC;
- PR and merge state;
- named follow-ups.
