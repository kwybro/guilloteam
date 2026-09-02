---
name: test-first-feature
description: Implements a Guilloteam feature through an executable specification: write a user-flow scenario and failing test first, implement only after the red result, then verify targeted and full checks. Use when a user asks to add or change a feature and wants test-first, spec-driven, or trustworthy agentic development.
disable-model-invocation: true
---

# Test-First Feature Development

Use this skill after the user describes a feature. Treat tests and the relevant
product document as the definition of supported behavior.

## Workflow

1. Read the relevant product and existing test documentation. Inspect the
   affected code and tests without editing production code.
2. Restate the feature as concise Given/When/Then scenarios. Add or update
   those scenarios in the appropriate document under `docs/`.
3. Add the smallest tests that prove the scenarios at the right boundary:
   domain tests for invariants, service/API tests for user-visible commands, and
   MCP tests only to prove the MCP adapter reaches the same workflow.
4. Run the new targeted test before implementing the feature. Report the
   failing command and why it fails.
5. Implement the smallest production change needed to make the test pass. Do
   not weaken, delete, or skip the new test to obtain a green result.
6. Run the targeted test again. Then run the relevant broader checks; by
   default use:

   ```text
   bun run lint
   bun run check-types
   bun test
   bun run build
   ```

7. Report the scenario, the red proof, the green proof, changed files, and any
   deferred behavior. Do not claim red-first development if the test already
   passed before implementation.

## Test design rules

- Name tests after user-observable behavior, not internal methods.
- Prefer the lowest test boundary that proves the behavior. Do not use browser
  tests when a domain or HTTP acceptance test proves the same rule.
- When changing persistence or concurrency behavior, use a real Postgres-backed
  integration test in addition to pure domain tests.
- Test every state transition, authorization rule, and preservation rule that a
  feature introduces.
- Keep MCP tests adapter-focused; duplicate neither domain logic nor all API
  acceptance cases.
- A test that proves a bug fix or feature is part of the product specification,
  not disposable test scaffolding.

## Guilloteam policy

Follow [the testing policy](../../../docs/testing-policy.md). For product
workflow changes, keep scenarios aligned with
[the Noise-to-Execution direction](../../../docs/noise-to-execution-direction.md).

## Git history

For a significant feature, preserve the red-to-green record as two commits when
the user wants auditable history:

```text
test: specify <behavior>
feat: support <behavior>
```

Never create an intentionally failing commit on a shared branch unless the user
has asked for that history. It is acceptable to keep the red proof in command
output and commit only the passing implementation when a clean shared history
is more important.
