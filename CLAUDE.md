# Guilloteam

Guilloteam is a Product Context engine. It provides one conceptual surface over:

- Intent: Git-versioned Constitution and World Model files.
- Learning: continuous Observations and inspectable Evidence.

## Architectural boundaries

- Guilloteam owns context, schemas, validation, and workflows. It does not own inference.
- Evidence must cite existing Observations.
- `@guilloteam/core` must stay independent of Drizzle and concrete storage.
- Storage extension points are domain-shaped repository operations, not generic database methods.
- `@guilloteam/storage-drizzle` is the reference SQLite implementation.
- MCP tool names must not expose physical storage boundaries.

## Monorepo

- `apps/cli`: local initialization and human-facing commands.
- `apps/mcp`: agent-facing MCP server.
- `packages/core`: domain model, repository contracts, and Product Context workflows.
- `packages/sdk`: application integration API.
- `packages/storage-drizzle`: Drizzle/Bun SQLite storage.

Use Bun, TypeScript, Biome, and `bun:test`.
