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
- user token: `local-user-token` (required for the web workspace's Project
  views, Noise capture, queue graduation, starting, and completion)

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
GUILLOTEAM_USER_ID = "admin"
```

The agent can retrieve the Project currently focused by `admin` in the web app,
then create Teams and Projects; capture, retrieve, and synthesize Noise;
develop Workshop Initiatives; and inspect the queue. The user-facing
application or API performs graduation, start-next, and completion.

## Architecture

- `apps/service`: self-hosted Hono Project API.
- `apps/mcp`: Project-first MCP adapter over that API.
- `packages/core`: Team, Project, Noise, Initiative, and Queue workflows.
- `packages/learning-client`: typed HTTP client for the Project API.
- `packages/storage-postgres`: Drizzle/Postgres implementation.

## Web workspace (local development)

The v0 web workspace opens one configured Project. It uses the local Vite proxy
to reach the service, so the browser never needs a separate service origin.

1. Start the service with its configured `GUILLOTEAM_USER_TOKEN`.
2. Copy `apps/web/.env.example` to `apps/web/.env.local` and set the user ID
   and matching local user token.
3. Run `bun --cwd apps/web run dev`.

This local token configuration is a development seam. Hosted authentication and
Team creation are intentionally deferred from the v0 workspace. The browser
lists Projects from its existing Teams and can create a Project within one.
