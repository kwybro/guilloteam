# Guilloteam

Guilloteam is an open-source Product Context engine for teams and their agents.
It gives any connected reasoning engine one coherent surface for understanding:

- **Intent:** the versioned Constitution and World Model of a product.
- **Learning:** continuous Observations and inspectable Evidence.

Guilloteam does not own inference. Your existing agent reads context and performs
Evidence Synthesis; Guilloteam owns the schemas, workflow, validation, and storage.

## Phase 0

Phase 0 implements the smallest complete loop:

```text
Intent + Observations → BYO agent → cited Evidence
```

Initialize a repository:

```bash
bun install
bun run guilloteam init "My Product"
```

Edit the generated files under `.guilloteam/intent/`, then record Learning:

```bash
bun run guilloteam observe "I wish I could organize projects" --type user_feedback
bun run guilloteam context
```

The default Learning store is a local SQLite database backed by Drizzle. It is a
reference implementation for evaluation and local workflows, not a requirement
that every adopter use SQLite.

## MCP

Run the local MCP server from an initialized repository:

```bash
bun run mcp
```

It exposes storage-agnostic tools including `get_product_context`,
`list_observations`, `get_pending_context_work`, and `create_evidence`.
Agents never need to know which parts live in Git and which live in a database.

## Adapter boundary

`@guilloteam/core` defines a small domain-shaped `LearningRepository`.
`@guilloteam/storage-drizzle` is the first implementation, using Bun SQLite and
Drizzle. We are intentionally building this path for ourselves before guessing
at every datastore permutation. Future official or community adapters can
implement the same product-context operations without exposing ORM details.
