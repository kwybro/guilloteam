# Guilloteam

Guilloteam is a Product Context engine. It provides one conceptual surface over:

- Intent: Git-versioned Constitution and World Model files.
- Learning: continuous Observations and inspectable Evidence.

## Architectural boundaries

- Guilloteam owns context, schemas, validation, and workflows. It does not own inference.
- Evidence must cite existing Observations.
- `@guilloteam/core` must stay independent of Drizzle and concrete storage.
- Storage extension points are domain-shaped repository operations, not generic database methods.
- `@guilloteam/storage-postgres` is the self-hosted Postgres implementation.
- MCP tool names must not expose physical storage boundaries.

## Monorepo

- `apps/cli`: local initialization and human-facing commands.
- `apps/mcp`: agent-facing MCP server.
- `apps/service`: self-hosted Hono Learning API.
- `packages/core`: domain model, repository contracts, and Product Context workflows.
- `packages/sdk`: application integration API.
- `packages/learning-client`: remote Learning protocol client.
- `packages/storage-postgres`: Drizzle/Postgres storage.

Use Bun, TypeScript, Biome, and `bun:test`.
