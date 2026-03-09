import {
	and,
	eq,
	inArray,
	isNull,
	memberships,
	TeamId,
	TeamInsert,
	TeamSelect,
	TeamUpdate,
	teams,
	user,
} from "@guilloteam/data-ops";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { db } from "../db";
import { authMiddleware, type Variables } from "../middleware/auth";
import { userTeamIds, validatorHook } from "../utilities";

const teamRoutes = new Hono<{ Variables: Variables }>();
teamRoutes.use(authMiddleware);

// GET /teams — list all teams
teamRoutes.get("/", async (c) => {
	const userId = c.get("userId");
	const result = await db
		.select()
		.from(teams)
		.where(
			and(inArray(teams.id, userTeamIds(userId)), isNull(teams.deletedAt)),
		);
	return c.json(TeamSelect.array().parse(result));
});

// GET /teams/:id — get a single team
teamRoutes.get("/:id", zValidator("param", TeamId, validatorHook), async (c) => {
	const userId = c.get("userId");
	const { id } = c.req.valid("param");
	const [team] = await db
		.select()
		.from(teams)
		.where(
			and(
				inArray(teams.id, userTeamIds(userId)),
				eq(teams.id, id),
				isNull(teams.deletedAt),
			),
		);
	if (!team) {
		return c.json({ error: "Team not found" }, 404);
	}
	const members = await db
		.select({
			userId: memberships.userId,
			email: user.email,
			role: memberships.role,
		})
		.from(memberships)
		.innerJoin(user, eq(memberships.userId, user.id))
		.where(eq(memberships.teamId, id));
	return c.json({ ...TeamSelect.parse(team), members });
});

// POST /teams — create a team and make the creator an owner
teamRoutes.post("/", zValidator("json", TeamInsert, validatorHook), async (c) => {
	const userId = c.get("userId");
	const body = c.req.valid("json");
	const [team] = await db.insert(teams).values(body).returning();
	if (!team) {
		return c.json({ error: "Could not create Team" }, 500);
	}
	await db
		.insert(memberships)
		.values({ userId, teamId: team.id, role: "owner" });
	return c.json(TeamSelect.parse(team), 201);
});

// PATCH /teams/:id — update a team (owners only)
teamRoutes.patch("/:id", zValidator("json", TeamUpdate, validatorHook), async (c) => {
	const { id } = c.req.param();
	const userId = c.get("userId");
	const updates = c.req.valid("json");
	const [membership] = await db
		.select()
		.from(memberships)
		.where(
			and(
				eq(memberships.teamId, id),
				eq(memberships.userId, userId),
				eq(memberships.role, "owner"),
			),
		);
	if (!membership) {
		return c.json({ error: "Team not found" }, 404);
	}
	const [team] = await db
		.update(teams)
		.set({ ...updates, updatedAt: new Date() })
		.where(eq(teams.id, id))
		.returning();
	if (!team) {
		return c.json({ error: "Team not found" }, 404);
	}
	return c.json(TeamSelect.parse(team));
});

// DELETE /teams/:id — soft delete (owners only)
teamRoutes.delete("/:id", zValidator("param", TeamId, validatorHook), async (c) => {
	const userId = c.get("userId");
	const { id } = c.req.valid("param");
	const [membership] = await db
		.select()
		.from(memberships)
		.where(
			and(
				eq(memberships.teamId, id),
				eq(memberships.userId, userId),
				eq(memberships.role, "owner"),
			),
		);
	if (!membership) {
		return c.json({ error: "Team not found" }, 404);
	}
	const [team] = await db
		.update(teams)
		.set({ deletedAt: new Date() })
		.where(eq(teams.id, id))
		.returning();
	if (!team) {
		return c.json({ error: "Team not found" }, 404);
	}
	return c.json(TeamSelect.parse(team));
});

export { teamRoutes };
