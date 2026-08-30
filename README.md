# Guilloteam

Guilloteam is an open-source, self-hostable shared execution system for teams
and their agents.

```text
Noise → Initiative Workshop → user-curated Queue → execution → outcome
```

Teams own Projects. Each Project has its own Noise, Workshop, execution queue,
and outcomes. Agents synthesize and shape work; users retain the authority to
graduate, start, and complete it.

## Run the service

The service bundles the Project API, Drizzle migrations, and Postgres:

```bash
docker compose up --build
```

Local credentials are defined in `docker-compose.yml`:

- ingest token: `local-ingest-token`
- agent token: `local-agent-token`
- user token: `local-user-token` (required for queue graduation, starting, and
  completion)

## Connect an MCP agent

The MCP bridge needs only the service URL and agent token. It has no repository
or `init` dependency. Configure an MCP client with the equivalent of:

```toml
[mcp_servers.guilloteam]
command = "bun"
args = ["run", "/absolute/path/to/guilloteam/apps/mcp/src/index.ts"]

[mcp_servers.guilloteam.env]
GUILLOTEAM_URL = "http://localhost:3400"
GUILLOTEAM_TOKEN = "local-agent-token"
```

The agent can create Teams and Projects; capture, retrieve, and synthesize
Noise; develop Workshop Initiatives; and inspect the queue. The user-facing
application or API performs graduation, start-next, and completion.

## Architecture

- `apps/service`: self-hosted Hono Project API.
- `apps/mcp`: Project-first MCP adapter over that API.
- `packages/core`: Team, Project, Noise, Initiative, and Queue workflows.
- `packages/learning-client`: typed HTTP client for the Project API.
- `packages/storage-postgres`: Drizzle/Postgres implementation.
