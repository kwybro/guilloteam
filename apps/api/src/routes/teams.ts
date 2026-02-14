import { eq, isNull, teams } from "@guilloteam/data-ops";
import {
	CreateTeam,
	DeleteTeam,
	flattenError,
	GetTeam,
	UpdateTeam,
} from "@guilloteam/schemas";
import { Hono } from "hono";
import { db } from "../db";

const teamRoutes = new Hono();

// GET /teams — list all teams
teamRoutes.get("/", async (c) => {
	const result = await db.select().from(teams).where(isNull(teams.deletedAt));
	return c.json(result);
});

// GET /teams/:id — get a single team
teamRoutes.get("/:id", async (c) => {
	const { id } = c.req.param();
	const parsed = GetTeam.safeParse({ id });
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}
	const [team] = await db
		.select()
		.from(teams)
		.where(eq(teams.id, parsed.data.id));
	if (!team) {
		return c.json({ error: "Team not found" }, 404);
	}
	return c.json(team);
});

// POST /teams — create a team
teamRoutes.post("/", async (c) => {
	const body = await c.req.json();
	const parsed = CreateTeam.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}
	const [team] = await db.insert(teams).values(parsed.data).returning();
	return c.json(team, 201);
});

// PATCH /teams/:id — update a team
teamRoutes.patch("/:id", async (c) => {
	const { id } = c.req.param();
	const body = await c.req.json();
	const parsed = UpdateTeam.safeParse({ ...body, id });
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}
	const { id: teamId, ...updates } = parsed.data;
	const [team] = await db
		.update(teams)
		.set({ ...updates, updatedAt: new Date() })
		.where(eq(teams.id, teamId))
		.returning();
	if (!team) {
		return c.json({ error: "Team not found" }, 404);
	}
	return c.json(team);
});

// DELETE /teams/:id — soft delete (sets deletedAt)
teamRoutes.delete("/:id", async (c) => {
	const { id } = c.req.param();
	const parsed = DeleteTeam.safeParse({ id });
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}
	const [team] = await db
		.update(teams)
		.set({ deletedAt: new Date() })
		.where(eq(teams.id, parsed.data.id))
		.returning();
	if (!team) {
		return c.json({ error: "Team not found" }, 404);
	}
	return c.json(team);
});

export { teamRoutes };
