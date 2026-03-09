# Guilloteam

A monorepo with a Hono API (`apps/api`) and a CLI (`apps/cli`). Uses Bun throughout.

## Stack

- **API**: Hono + Drizzle ORM + better-auth + PostgreSQL
- **CLI**: citty + @clack/prompts, binary name `guillo`
- **Shared schemas**: `packages/data-ops/src/schemas.ts` — Zod schemas generated from Drizzle tables via `drizzle-zod`

## CLI conventions

Human-first output: default to readable, `--json` flag or pipe detection enables JSON.

```ts
const json = args.json || !process.stdout.isTTY;
if (!json) { /* clack human output */ } else { /* JSON */ }
```

## API conventions

### Validation — needs migration (next task)

Currently hand-rolling `safeParse` in every route handler:

```ts
const body = await c.req.json();
const parsed = TaskInsert.safeParse({ ...body, projectId });
if (!parsed.success) return c.json({ error: flattenError(parsed.error) }, 400);
```

**Migrate to `@hono/zod-validator`** (`zValidator`). This requires a schema cleanup first:
body schemas (`TaskInsert`, `ProjectInsert`, `TeamUpdate`, etc.) currently expect path
params to be merged in (`projectId`, `teamId`, `id`). These fields should be removed from
body schemas — they're always injected server-side from the URL, not from the request body.

Pattern after migration:
```ts
app.post('/teams/:teamId/projects', zValidator('json', ProjectBody), async (c) => {
  const body = c.req.valid('json');   // typed, already validated
  const { teamId } = c.req.param();
  // ...
});
```

Files to update:
- `packages/data-ops/src/schemas.ts` — strip path param fields from Insert/Update schemas
- `apps/api/src/routes/tasks.ts`
- `apps/api/src/routes/projects.ts`
- `apps/api/src/routes/teams.ts`
- `apps/api/src/routes/invites.ts`
- `apps/api/src/routes/auth.ts`
