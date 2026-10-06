---
name: test-audit
description: "Use whenever writing, changing, fixing, reviewing, or deleting tests: adding tests for a feature or a bug fix, deciding what kind of test to write, getting tests green after a change, reviewing the tests in a diff or PR, cleaning up flaky, duplicate, or low-value tests in a module, or removing test-only exports and hooks from production code. Gates each new test on the contract it protects, proves it can fail, and audits existing tests for assertions that can never fail, implementation-coupled or duplicate coverage, and flakiness."
---

# Test Audit

First read the repository's root and scoped instruction files (such as `AGENTS.md`) and its package scripts for the test command, the test layout, and any rules about tests. Then pick the mode: **authoring** (adding, changing, or fixing a test, or reviewing a diff that does) uses this file; **audit** (sweeping existing tests for junk patterns and test-only seams, up to a whole module or subsystem) uses this file, then [AUDIT.md](AUDIT.md).

## Terms

- **Owner**: the production module that implements a behavior.
- **Owner boundary**: the entry point real callers use to reach that behavior, such as an exported API, SDK surface, HTTP route, CLI command, or message handler. It is the strongest place to observe the behavior without reaching into internals.
- **Seam**: an export, flag, wrapper, global, or injection hook that lets a test reach inside the owner. A test-only seam is one no production caller needs; that tests rely on it is what makes it test-only, not a reason to keep it.

## Value bar

Tests earn their maintenance cost by protecting observable behavior, a credible regression, or an independently meaningful contract. A coverage percentage is not a contract. A test that breaks under behavior-preserving refactoring asserts implementation: the authoring gate rejects a new one until it is rewritten at the owner boundary, and an audit treats an existing one as suspect, not automatically deletable. Static or slow is not a deletion reason either.

Keep a test when it independently enforces a public API, SDK, protocol, wire or file format, config, migration, storage, security, platform, default value, exact output bytes, package, or architecture contract. Also keep:

- call ordering when order is observable behavior;
- regressions with a credible failure mode;
- source inspection when it is the cheapest independent guard: it fails when the contract changes (the user-facing key, byte, or path) and survives an identifier-only refactor.

## Junk patterns

Both modes use this list: a new test that matches a pattern fails the authoring gate, and audits hunt for existing tests that do. A match counts only when the value bar names no contract the test independently guards: a test that pins a documented default is a contract, not a restated constant. Use the group names when reporting.

A match says the test is not doing its job, not that the job is worthless. Take the contract from the docs, types, and callers, not from what the implementation does today. Typical repairs: assert the exact value, await the assertion, give the fixture the condition its name promises, fix the clock, route the test into the test command, or rewrite it at the owner boundary.

**Proves nothing**: passes whether or not the behavior works.

- assertion-free coverage probes;
- self-comparisons, such as comparing a value with itself or with an unchanged copy of the input;
- expected values computed at test time, by calling the helper or renderer under test or by repeating its formula (a committed golden file that a reviewer read is different);
- mocks that implement the asserted behavior;
- assertions that can run zero times, such as an un-awaited `.resolves`, `.rejects`, or `assert.rejects`, or an assertion inside a `catch`, loop, branch, or callback the input never reaches;
- assertions too weak to fail, such as `toBeDefined`, `toBeTruthy`, `assert.ok`, `is not None`, `not.toThrow`, or a length or type check, when the contract names an exact value; also a bare `toThrow()` or `pytest.raises(Exception)`, which a `TypeError` from a typo would satisfy;
- negative controls that pass for an unrelated reason, such as a denial from a different guard or a rejection the production path never reaches;
- tests that never run: skipped or todo tests, an `.only` that silences its siblings, environment gates no CI job satisfies, or files the test command's patterns never match.

**Restates the implementation**: breaks on refactors, not regressions.

- copied fixtures, inventories, manifests, export lists, or whole-object snapshots of internal state;
- exact source, import, or string greps;
- private predicate or call-shape tests duplicated at the owner boundary;
- tests that restate a declared capability flag instead of exercising the behavior the flag promises.

**Duplicates stronger proof**:

- duplicate invocations of the same contract;
- the same scenario replayed at another layer, unless that layer adds its own risk, such as a transport or lifecycle failure the owner-boundary test cannot reach;
- per-implementation replays of a shared helper's tests, such as every adapter re-testing the helper it calls;
- runtime checks the type checker already enforces, such as an export existing or a field having a type.

**Fakes or overstates the path**:

- one identical mock standing in for different APIs;
- fakes that behave differently from the real collaborator on the path under test, such as a fake repository that skips the real one's normalization or holds records the real one never could;
- fixtures that hand the test the result, acknowledgement, or callback ordering the owner should produce, or persistence asserted against a store the path never writes;
- names or fixtures that promise more than the input exercises, such as an "expires stale sessions" test whose fixture has no stale session.

**Flaky**: passes or fails for reasons outside the code under test.

- dependence on the real clock, timers, randomness, locale, or time zone without a fixed clock, seed, or setting, including fixture dates that will fall into the past;
- real network or third-party calls outside a test meant to cover that integration;
- shared mutable state, such as globals, database rows, or files that other tests also touch, or reliance on test run order;
- sleeps or fixed timeouts instead of waiting on the observable condition.

**Keeps test-only code alive**:

- tests whose only purpose is preserving test-only exports, globals, or wrappers;
- dead production code whose only callers are tests.

## Authoring gate

Before adding or changing a test, answer four questions. A missing answer means do not add it yet.

1. **Contract**: what observable behavior, invariant, or independent contract does it protect?
2. **Regression**: what credible regression makes it fail?
3. **Gap**: why does existing coverage not already catch that failure? Search the owner's tests first. Prefer extending a table-driven case or shared fixture over a near-duplicate test, and reuse existing setup instead of copying it.
4. **Seam**: does it need a test-only seam? If yes, test at the owner boundary instead; a test-only seam turns internals into a surface every refactor must preserve.

Then check the test against every [junk pattern](#junk-patterns).

### Reviewing a diff

Work through a diff in this order, so the production side gets the same scrutiny as the tests:

1. List the behaviors the diff adds or changes, from the production code, its comments, and its docs, not from the tests.
2. For each test in the diff, answer the four gate questions and check it against every junk pattern. Read the real collaborator behind each fake and compare how the two behave on the test's inputs, and check each hard-coded date against today's date and the clock the code reads. When you cannot tell whether a test can fail, prove it as in [Proving a new test](#proving-a-new-test).
3. Check the production side for test-only seams: exports, setters, flags, or branches that no production code calls. Each one is a finding, and a claimed reason for it, such as a slow or external dependency, gets checked against the code. The fix is to test through the owner boundary with the real collaborator, or to make the dependency a parameter that production passes too.
4. Report as described under [Report](#report).

### Finding what to test

When a change adds or alters behavior, list each observable behavior it introduces and name the test that covers it, or fill the gap.

For each behavior, check the edges that apply: empty, missing, or null input; boundaries and off-by-one values; invalid or malformed input; the error and rejection paths; unauthorized or unauthenticated callers; duplicates and repeated calls; concurrent calls; large inputs; and non-ASCII text. Cover an edge only when it has a credible regression.

### Choosing the test

Pick the kind of test from the behavior, then write it at the owner boundary with the project's existing framework, file layout, naming, and helpers:

| Behavior | Test | Notes |
| --- | --- | --- |
| Logic with a rule that holds for every input, such as parsing, encoding, pricing, dates, sorting | Property-based, plus a few worked examples | Assert invariants like round-trips, ordering, and bounds, not recomputed outputs |
| A module or service reached through its exported API, route, or handler | Integration at the owner boundary | Real internal collaborators and a real or in-memory store; mock only external systems |
| Pure computation with a few distinct cases | Table-driven unit test | Expected values come from the spec or worked examples |
| A payload shape agreed between services, packages, or a client and server | Contract test | Assert the fields and types callers rely on, not the whole object |
| UI component behavior | Component test driven by user events | Query by role or visible text and assert what the user sees, not internal state or hook calls |
| A critical user flow such as sign-up, login, checkout, or the core feature | End-to-end | Keep these few; every other case belongs lower down |
| A fixed bug | Regression test | See [Regression tests](#regression-tests) |
| Rendered UI whose exact output is the contract | Snapshot or visual diff | Only when a reviewer will actually read the diff |

Mock only at system boundaries: third-party APIs, email, payments, the clock, and randomness. Never mock the owner's own modules; a mocked internal collaborator is a test-only seam. A test of a default that reads the clock or randomness still controls it, for example by mocking `Date.now` or seeding the generator. Do not add a test dependency, such as a property-testing library, without asking; the fallback is a plain loop over a small range of inputs that asserts the same invariant, plus worked examples at the boundaries.

Name each test after the behavior and condition it checks, so a failure reads as a broken contract.

### Proving a new test

A test that has never failed has not proved anything. Before keeping each new test, watch it fail on its intended assertion: write it before the behavior exists, or temporarily break the one behavior the test names and run it. A failure from a missing export, file, or symbol is not that assertion failing; when the behavior's entry point does not exist yet, report the test as unproven and prove it once the entry point lands. To prove a rounding test, change the rounding; to prove an expiry test, drop the expiry check. Making the whole function return a wrong value fails every test at once and proves none of them in particular. Then restore the owner and confirm with `git status` and `git diff` that only your intended changes remain, with no stray backups or scratch files. A test that still passes against the broken owner fails the gate; often its input never exercises the behavior, such as a rounding test whose amounts divide evenly.

### Regression tests

A regression test that never demonstrably failed proves the mock, not the fix. Fix the bug at its owner boundary and put one regression test there. Give it inputs that also fail the plausible wrong fixes, not only the reported case: for an off-by-one or rounding bug, include the values just past the boundary, where a near-miss fix still breaks. Then prove it:

1. With no test run active, revert only the production fix, for example `git stash push -- <fix paths>`.
2. Run the test and confirm it fails on the intended assertion, not an import, setup, or timeout error.
3. Restore the fix and confirm the test passes.

When the fix does not exist yet, because you write the test first or someone else will write the fix, the unfixed code is the broken owner: run the test, confirm it fails on the intended assertion, and hand it off. Whoever lands the fix confirms it passes.

### When an existing test fails

A failing test is evidence, not an obstacle. Before touching it, decide which side is wrong, and name that case for each failing test in your summary:

- The behavior regressed: fix the owner and leave the test alone.
- The contract changed on purpose: assert the new contract's exact value. When `save()` starts returning the stored record instead of `true`, assert the record's fields, not `ok(result)` or `notEqual(result, null)`.
- The test asserts implementation, so it broke under a behavior-preserving change: rewrite it at the owner boundary instead of patching it to match the new internals, then remove or flag the internals it reached into if nothing else uses them.

Never make a failing test pass by weakening its assertion, loosening a matcher, skipping it, or deleting it without an audit ledger entry.

## Running tests

Never edit source or tests while a test run is in progress in the same checkout; a run that sees half-applied edits proves nothing. When someone else is editing the same checkout, such as another agent working in parallel, write and prove tests in a separate git worktree instead: a temporary break you make to prove a test would land in their runs, and their half-applied edits in yours. Iterate on the smallest set of owner and sibling tests with the project's own test command, as documented in its instruction files or package scripts. Before handing off, run the checks the repository requires for the changed paths.

## Report

Audits hand off as described in AUDIT.md. For authoring and review, keep it proportionate; one line per test is usually enough.

- For each new or changed test: the contract, the regression it catches, and how you saw it fail.
- For a review: each finding as `path:line`, the failed question or junk pattern, and the fix; then the behaviors the diff adds that no test covers.
- Behaviors or edges left untested, and why.
