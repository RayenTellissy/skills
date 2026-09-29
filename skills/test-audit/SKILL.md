---
name: test-audit
description: "Invoke whenever writing, changing, reviewing, or deleting tests: adding a regression test for a bug fix, reviewing tests in a diff or PR, cleaning up a test suite or a whole module's tests, or removing test-only exports and hooks from production code. Gates new tests and audits existing ones for low-value, duplicate, or implementation-coupled coverage."
---

# Test Audit

One value bar, two modes. Read the repository's root and scoped instruction files (such as `AGENTS.md`) first, then pick the mode:

| Mode | Use when | Read |
| --- | --- | --- |
| Authoring | Adding or changing a test, or reviewing a diff that does | This file |
| Audit | Sweeping existing tests for junk patterns and test-only seams, up to a whole module or subsystem | This file, then [AUDIT.md](AUDIT.md) |

## Terms

- **Owner**: the production module that implements a behavior.
- **Owner boundary**: the entry point real callers use to reach that behavior, such as an exported API, SDK surface, HTTP route, CLI command, or message handler. It is the strongest place to observe the behavior without reaching into internals.
- **Primary test**: the one test that owns a contract at its owner boundary. A test at another layer needs its own distinct risk, such as a transport or lifecycle failure the primary test cannot reach.
- **Seam**: an export, flag, wrapper, global, or injection hook that lets a test reach inside the owner. A test-only seam is one no production caller needs.

## Value bar

Tests earn their maintenance cost by protecting observable behavior, a credible regression, or an independently meaningful contract. A test that breaks under behavior-preserving refactoring asserts implementation: the authoring gate rejects a new one until it is rewritten at the owner boundary, and an audit treats an existing one as suspect, not automatically deletable.

Keep a test when it independently enforces a public API, SDK, protocol, wire or file format, config, migration, storage, security, platform, default value, exact prompt or output bytes, generated cross-language code, package, release, or architecture contract. Also keep:

- call ordering when order is observable behavior;
- regressions with a credible failure mode;
- source inspection when it is the cheapest independent guard: it fails when the contract changes (the user-facing key, byte, or path) and survives an identifier-only refactor;
- a retained test that fails on the baseline: treat it as a possible product bug, reproduce it, and repair the owner rather than deleting it.

Static or slow is not a deletion reason. A test that resembles implementation may still be the independent contract; prove otherwise before removing it.

## Junk patterns

Both modes use this list: a new test that matches a pattern fails the authoring gate, and audits hunt for existing tests that do. A match counts only when the value bar names no contract the test independently guards. Use the group names when reporting what was removed.

**Proves nothing**: passes whether or not the behavior works.

- assertion-free coverage probes;
- self-comparisons and identity copiers;
- expected values produced by the helper or renderer under test;
- mocks that implement the asserted behavior;
- assertions that can run zero times, such as an un-awaited `.resolves` or `.rejects`, or an `expect` inside a loop, branch, or callback the input never reaches;
- assertions too weak to fail, such as `toBeDefined`, `toBeTruthy`, `not.toThrow`, or a length or type check, when the contract names an exact value;
- negative controls that pass for an unrelated reason, such as a denial from a different guard or a rejection the production path never reaches;
- tests that never run: skipped or todo tests, environment gates no CI job satisfies, or files no test config includes. Route them if the contract matters.

**Restates the implementation**: breaks on refactors, not regressions.

- copied fixtures, inventories, manifests, export lists, or whole-object snapshots of internal state;
- exact source, import, or string greps;
- private predicate or call-shape tests duplicated at the owner boundary;
- tests that restate a declared capability flag instead of exercising the behavior the flag promises.

**Duplicates stronger proof**:

- duplicate invocations of the same contract;
- per-implementation replays of a shared helper's tests, such as every adapter re-testing the helper it calls;
- runtime checks the type checker already enforces, such as an export existing or a field having a type.

**Fakes or overstates the path**:

- one identical mock standing in for different APIs;
- fixtures that hand the test the result, acknowledgement, or callback ordering the owner should produce, or persistence asserted against a store the path never writes;
- names or fixtures that promise more than the input exercises, such as an "expires stale sessions" test whose fixture has no stale session.

**Flaky**: passes or fails for reasons outside the code under test.

- dependence on real time, timers, randomness, locale, or time zone without a fixed clock, seed, or setting;
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
3. **Gap**: why does existing coverage not already catch that failure? Search the owner's tests first. Prefer extending a table-driven case or shared fixture over a near-duplicate test, and consolidate duplicated setup in the same change.
4. **Seam**: does it need a test-only seam? If yes, test at the owner boundary instead; a test-only seam turns internals into a surface every refactor must preserve.

Then check the test against every [junk pattern](#junk-patterns). When reviewing someone else's diff, report each failed question or matched pattern as a finding.

State each new test's contract and regression in your summary or PR body, so reviewers can see the gate was applied.

### Finding what to test

When a change adds or alters behavior, list each observable behavior it introduces and name the test that covers it. A behavior with no covering test is a gap to fill or to report, not something to skip silently.

For each behavior, check the edges that apply: empty, missing, or null input; boundaries and off-by-one values; invalid or malformed input; the error and rejection paths; unauthorized or unauthenticated callers; duplicates and repeated calls; concurrent calls; large inputs; and non-ASCII text. Cover an edge only when it has a credible regression; otherwise say why it does not apply.

### Choosing the test

Pick the kind of test from the behavior, then write it at the owner boundary:

| Behavior | Test | Notes |
| --- | --- | --- |
| Logic with a rule that holds for every input, such as parsing, encoding, pricing, dates, sorting | Property-based, plus a few worked examples | Assert invariants like round-trips, ordering, and bounds, not recomputed outputs |
| A module or service reached through its exported API, route, or handler | Integration at the owner boundary | Real internal collaborators and a real or in-memory store; mock only external systems |
| Pure computation with a few distinct cases | Table-driven unit test | Expected values come from the spec or worked examples |
| A payload shape agreed between services, packages, or a client and server | Contract test | Assert the fields and types callers rely on, not the whole object |
| A critical user flow such as sign-up, login, checkout, or the core feature | End-to-end | Keep these few; every other case belongs lower down |
| A fixed bug | Regression test | See [Regression tests](#regression-tests) |
| Rendered UI whose exact output is the contract | Snapshot or visual diff | Only when a reviewer will actually read the diff |

Mock only at system boundaries: third-party APIs, email, payments, the clock, and randomness. Never mock the owner's own modules; a mocked internal collaborator is a test-only seam.

### Proving a new test

A test that has never failed has not proved anything. Before keeping a new test, watch it fail on its intended assertion: write it before the behavior exists, or temporarily break the owner, such as by inverting a condition or returning a wrong value, run it, then restore the owner. A test that still passes against the broken owner fails the gate.

### Regression tests

A regression test that never demonstrably failed proves the mock, not the fix. Fix the bug at its owner boundary, put one regression test there, and prove it:

1. With no test run active, revert only the production fix, for example `git stash push -- <fix paths>`.
2. Run the test and confirm it fails on the intended assertion, not an import, setup, or timeout error.
3. Restore the fix and confirm the test passes.

Do not replay the same scenario at every layer the bug crosses.

## Running tests

Never edit source or tests while a test run is in progress in the same checkout; a run that sees half-applied edits proves nothing. Run the smallest set of owner and sibling tests with the project's own test command, as documented in its instruction files or package scripts.
