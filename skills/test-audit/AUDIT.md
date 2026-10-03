# Audit mode

Focused sweeps for existing tests that match the [junk patterns](SKILL.md#junk-patterns) and the test-only seams they keep alive. Optimize for confidence, not deletion count: a repaired test that now catches a real regression is worth more than a deleted one.

## 1. Discover

Keep discovery read-only. For broad scope, split the sweep into parallel lanes, such as subagents, when available: one per top-level area (for example app code, shared packages, tooling) plus one cross-cutting junk-pattern sweep. Each lane returns ledger entries in the format below.

Match depth to scope:

- One module or a few files: read every test in it and give each a verdict (keep, repair, or delete), with the contract it guards or aims at and any pattern it matches.
- A whole subsystem you were asked to prune: inventory every test file it owns, then work through the leads in each.
- An open-ended sweep with no named scope: prefer a few high-confidence candidates over a large speculative inventory.

Start with what actually runs. For each test file in scope, confirm the test command and CI run it: its tests appear in the output, or a deliberately failing assertion in it turns the run red. List skipped, todo, and `.only` tests too. Then search for mechanical leads; a hit is a lead, not a verdict, and only reading each test finds every match:

| Group | Search for |
| --- | --- |
| Proves nothing | tests with no assertion, plus the zero-run and too-weak assertions listed under Proves nothing in [SKILL.md](SKILL.md#junk-patterns) |
| Restates the implementation | tests that read source files; snapshots of internal objects; call assertions on the owner's own modules |
| Flaky | `sleep`, `setTimeout`, `waitForTimeout`, the real clock (`Date.now()`, `new Date()`, `datetime.now()`), unseeded randomness, hard-coded dates near today |
| Keeps test-only code alive | exports, flags, or hooks named for tests (`__test`, `ForTesting`, `resetForTests`, `_internal`), `NODE_ENV === "test"` branches, `@VisibleForTesting` |

Before judging a candidate, read the complete test and its owner: entry point, callers, callees, sibling implementations, overlapping tests, and history. When the test claims dependency-backed behavior, inspect the dependency source or types directly.

When reading cannot settle what a candidate detects, measure it: break the one behavior the test claims to catch, as in [Proving a new test](SKILL.md#proving-a-new-test), run the candidate and its claimed stronger proof, then restore the owner. If only the candidate fails, it is not a duplicate; if neither fails, it proves nothing. A mutation-testing tool does the same at scale when the project has one.

## 2. Record the ledger

Fill every field before editing; a missing field means the candidate is not ready to change.

- **Test**: exact name and `path:line`.
- **Pattern**: the junk-pattern group and item it matches.
- **Detects**: the failure it can actually catch, and the contract behind it.
- **Stronger proof**: the owner-boundary test that still covers that failure, or why no proof is needed.
- **Seam callers**: non-test callers of the production or support seam it covers.
- **History**: why the test or seam exists (`git log --follow -- <test>`, `git log -S <seam>`).
- **Action**: delete, repair, move to the owner boundary, route into the test command, or keep as a false positive.
- **Unlocks**: production or test-support code the change lets you delete.
- **Risk and check**: what could break, and the focused validation command.

Report the ledger. If the request asked only for a review, stop there.

## 3. Edit

Choose one coherent owner-boundary batch.

- Delete tests whose contract has stronger proof or is not worth guarding, together with the test-only exports, globals, wrappers, and dead production paths they kept alive. Do not preserve aliases.
- Remove test-only seams that retained tests still use, such as a reset hook for a shared global: give those tests their own instance or reach the behavior through the owner boundary.
- Repair tests whose contract matters and has no stronger proof, then prove each repaired test fails against a broken owner, as in [Proving a new test](SKILL.md#proving-a-new-test). When a repaired or routed test fails against the real owner, handle it as in [When an existing test fails](SKILL.md#when-an-existing-test-fails), and report the bug instead if the fix is out of scope.
- Move retained regressions to the owner boundary's tests, and merge near-duplicates into one table-driven or generic contract test.

Prefer net-negative production LOC. Do not add replacement tests that restate the same implementation.

## 4. Validate

1. Run the smallest set of owner and sibling tests, then the checks the repository requires, as in [Running tests](SKILL.md#running-tests).
2. For removed source greps, run the script, build, or dry run that owns the real contract.
3. Format the changed files, then run `git diff --check`.
4. Inspect `git diff --numstat`; report production and tooling separately from tests and test support.
5. Review the final diff before handing off, with a code-review skill if one is available.

## 5. Land

Follow the repository's PR flow. Land one coherent PR at a time, then refresh from the base branch.

Start another batch only when the request covers it and fresh read-only discovery finds candidates with complete ledgers. Otherwise stop and list the remainder as named follow-ups.

## 6. Hand off

Report from the final diff and the commands you actually ran, not from memory:

- why the removed tests existed, and which junk-pattern groups were removed;
- repaired or routed tests, and what each now catches;
- product bugs those tests exposed, and whether you fixed them;
- production owner simplifications;
- retained false positives and why they remain valuable;
- focused and full proof actually run;
- production versus test LOC;
- PR and merge state;
- named follow-ups.