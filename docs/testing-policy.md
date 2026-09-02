# Testing Policy

**Status:** ratified engineering policy.

Guilloteam develops supported behavior through executable specifications. The
relevant product document and its tests together define what the product does.
Generated code is not accepted merely because it appears plausible.

## Feature workflow

Every new user-visible behavior or bug fix follows this sequence:

1. Describe the behavior as concise Given/When/Then scenarios in the relevant
   document under `docs/`.
2. Add the smallest tests that prove those scenarios.
3. Run the new targeted test and confirm it fails for the expected missing
   behavior.
4. Implement the smallest change that makes the test pass.
5. Re-run the targeted test and then the full required verification suite.
6. Record any intentionally deferred behavior rather than silently implying
   support for it.

A test that passes before implementation is useful existing coverage, but it is
not evidence of a red-to-green change. In that case, identify the existing
behavior and add the missing scenario or explain why no code change is needed.

## Test layers

- **Domain tests** prove core invariants: lifecycle transitions, Queue ordering,
  provenance, merging, validation, and authorization decisions.
- **HTTP/API acceptance tests** prove user-visible commands through the shared
  command layer.
- **MCP contract tests** prove MCP tools invoke the same commands and preserve
  the same authorization and validation behavior. They should not duplicate
  every domain or API test.
- **Browser tests** are reserved for a small set of critical web-app journeys.
  They verify that the interface enables a user flow; they do not replace domain
  or API coverage.

Changes involving migrations, transactions, Queue ordering, or concurrency also
need a real Postgres-backed integration test. Mocks cannot establish those
database guarantees.

## Required verification

Unless a change makes one inapplicable, the completion gate is:

```text
bun run lint
bun run check-types
bun test
bun run build
```

Targeted tests should run before the full suite during development. CI must run
the same completion gate before a change is accepted.

## Review standard

Tests must use user-observable names and assert behavior rather than private
implementation details. Production code must not weaken, delete, skip, or
rewrite a feature test merely to obtain a passing run.

For significant features, retain an auditable red-to-green record when useful:

```text
test: specify <behavior>
feat: support <behavior>
```

This may be two commits on a feature branch, or the recorded targeted-test
output during development when a clean shared commit history is preferred.
