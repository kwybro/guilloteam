# Guilloteam

Guilloteam is an open-source Product Context engine for teams and their agents.
It combines Git-versioned **Intent** with continuously shared **Learning**.

```text
Local repository Intent + self-hosted Learning → local MCP → your agent
```

Guilloteam owns context and deterministic workflows. It does not own inference.

## Run the Learning service

The companion service bundles a Hono API, Drizzle migrations, and Postgres:

```bash
docker compose up --build
```

Local credentials are defined in `docker-compose.yml`:

- ingest token: `local-ingest-token`
- agent token: `local-agent-token`

## Initialize a repository

```bash
bun run guilloteam init "My Product" --url http://localhost:3400
export GUILLOTEAM_TOKEN=local-agent-token
```

Edit `.guilloteam/intent/constitution.md` and
`.guilloteam/intent/world-model.md`, then record Learning:

```bash
bun run guilloteam observe "I wish I could organize projects" --type user_feedback
bun run guilloteam context
```

Run the local MCP bridge from the initialized repository:

```bash
bun run mcp
```

The bridge reads local Intent and queries the shared Learning service, presenting
one Product Context surface to the connected agent.

## Application SDK

Deployed applications use an ingest-scoped token:

```ts
import { createGuilloteam } from "@guilloteam/sdk";

const guilloteam = createGuilloteam({
  url: process.env.GUILLOTEAM_URL!,
  token: process.env.GUILLOTEAM_INGEST_TOKEN!,
});

await guilloteam.observe({
  type: "user_feedback",
  content: feedback,
  source: "feedback_form",
});
```

## Architecture

- `apps/service`: self-hosted Hono Learning API.
- `apps/mcp`: local bridge combining repository Intent with remote Learning.
- `apps/cli`: repository initialization and local commands.
- `packages/core`: Product Context domain and workflows.
- `packages/learning-client`: HTTP implementation of `LearningRepository`.
- `packages/storage-postgres`: Drizzle/Postgres implementation.
- `packages/sdk`: deployed application ingestion API.
