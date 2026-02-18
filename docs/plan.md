# Guilloteam MVP: API + DB

## Context
Building the foundation of guilloteam — a headless, open-source task management system. The goal is a clean API backed by SQLite that lets humans and agents create and manage Teams, Projects, and Tasks. No auth, no UI — just data in, data out.

## Data Model
Minimal fields, first-principles thinking. We can always add fields later.

```
Team:     id (uuid), name, created_at, updated_at
Project:  id (uuid), team_id (fk), name, created_at, updated_at
Task:     id (uuid), project_id (fk), title, status (open|in_progress|done|cancelled), created_at, updated_at
```

## Architecture

```
packages/schemas    → Zod validation schemas (shared between API and future CLI)
packages/db         → Drizzle ORM schema, migrations, DB client
apps/api            → Hono HTTP API server
```

## Implementation Steps

### 1. Set up `packages/schemas`
- `package.json` with zod dependency
- `src/index.ts` — export Zod schemas for:
  - `createTeam`, `updateTeam`
  - `createProject`, `updateProject`
  - `createTask`, `updateTask`
- Keep schemas minimal (matching the fields above)

### 2. Set up `packages/db`
- `package.json` with `drizzle-orm`, `drizzle-kit` deps
- `src/schema.ts` — Drizzle table definitions for teams, projects, tasks
- `src/client.ts` — DB connection factory (takes a file path, returns drizzle instance)
- `src/index.ts` — barrel export
- `drizzle.config.ts` — config for drizzle-kit migrations
- Generate initial migration with `drizzle-kit generate`

### 3. Set up `apps/api`
- `package.json` with `hono`, `@hono/node-server` deps, plus workspace deps on `@guilloteam/db` and `@guilloteam/schemas`
- `src/index.ts` — Hono app entry, mounts route groups
- `src/routes/teams.ts` — CRUD: POST/GET(list)/GET(by id)/PATCH/DELETE
- `src/routes/projects.ts` — CRUD scoped to team: POST/GET(list)/GET(by id)/PATCH/DELETE
- `src/routes/tasks.ts` — CRUD scoped to project: POST/GET(list)/GET(by id)/PATCH/DELETE
- Each route validates input with schemas from `@guilloteam/schemas`

### 4. Write tests (TDD)
- Use `bun:test` (built into Bun, zero config)
- `apps/api/tests/teams.test.ts` — test all team CRUD endpoints
- `apps/api/tests/projects.test.ts` — test all project CRUD endpoints
- `apps/api/tests/tasks.test.ts` — test all task CRUD endpoints
- Tests use an in-memory SQLite DB (`:memory:`) for isolation
- Write tests FIRST, confirm they fail, then implement

### 5. Turbo config
- Update `turbo.json` build outputs (remove `.next` references)
- Add `test` task to turbo

### 6. Update .gitignore
- Add `*.db` for SQLite files

## API Design

```
# Teams
POST   /teams              → create team
GET    /teams              → list teams
GET    /teams/:id          → get team
PATCH  /teams/:id          → update team
DELETE /teams/:id          → delete team

# Projects (nested under team)
POST   /teams/:teamId/projects          → create project
GET    /teams/:teamId/projects          → list projects
GET    /teams/:teamId/projects/:id      → get project
PATCH  /teams/:teamId/projects/:id      → update project
DELETE /teams/:teamId/projects/:id      → delete project

# Tasks (nested under project)
POST   /projects/:projectId/tasks       → create task
GET    /projects/:projectId/tasks       → list tasks (filterable by status)
GET    /projects/:projectId/tasks/:id   → get task
PATCH  /projects/:projectId/tasks/:id   → update task
DELETE /projects/:projectId/tasks/:id   → delete task
```

All responses return JSON. Errors return `{ error: string }` with appropriate HTTP status codes.