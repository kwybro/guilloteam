import {
	and,
	eq,
	gt,
	InviteCreate,
	InviteId,
	InviteSelect,
	invites,
	isNull,
	memberships,
	TeamSelect,
	teams,
	user,
} from "@guilloteam/data-ops";
import { flattenError } from "@guilloteam/schemas";
import { Hono } from "hono";
import { db } from "../db";
import { authMiddleware, type Variables } from "../middleware/auth";
import { isTeamOwner } from "../utilities";

const inviteRoutes = new Hono<{ Variables: Variables }>();
inviteRoutes.use(authMiddleware);

// POST /teams/:teamId/invites — summon a user (owner only)
inviteRoutes.post("/teams/:teamId/invites", async (c) => {
	const { teamId } = c.req.param();
	const userId = c.get("userId");

	if (!(await isTeamOwner(userId, teamId))) {
		return c.json({ error: "Not authorized" }, 403);
	}

	const body = await c.req.json();
	const parsed = InviteCreate.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}

	const { email } = parsed.data;
	const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

	// Re-summoning the same email replaces the existing invite
	await db
		.delete(invites)
		.where(and(eq(invites.email, email), eq(invites.teamId, teamId)));

	const [invite] = await db
		.insert(invites)
		.values({ teamId, email, invitedBy: userId, expiresAt })
		.returning();

	if (!invite) {
		return c.json({ error: "Could not create invite" }, 500);
	}

	// TODO: send "You've been summoned." email to invite.email

	return c.json({ token: invite.token, email: invite.email }, 201);
});

// GET /teams/:teamId/invites — list pending invites (owner only)
inviteRoutes.get("/teams/:teamId/invites", async (c) => {
	const { teamId } = c.req.param();
	const userId = c.get("userId");

	if (!(await isTeamOwner(userId, teamId))) {
		return c.json({ error: "Not authorized" }, 403);
	}

	const now = new Date();
	const pending = await db
		.select()
		.from(invites)
		.where(
			and(
				eq(invites.teamId, teamId),
				isNull(invites.acceptedAt),
				gt(invites.expiresAt, now),
			),
		);

	return c.json(InviteSelect.array().parse(pending));
});

// DELETE /teams/:teamId/invites/:id — revoke an invite (owner only)
inviteRoutes.delete("/teams/:teamId/invites/:id", async (c) => {
	const { teamId, id } = c.req.param();
	const userId = c.get("userId");

	if (!(await isTeamOwner(userId, teamId))) {
		return c.json({ error: "Not authorized" }, 403);
	}

	const parsed = InviteId.safeParse({ id });
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}

	const [deleted] = await db
		.delete(invites)
		.where(and(eq(invites.id, parsed.data.id), eq(invites.teamId, teamId)))
		.returning();

	if (!deleted) {
		return c.json({ error: "Invite not found" }, 404);
	}

	return c.json(InviteSelect.parse(deleted));
});

// POST /invites/:token/accept — accept a summon
inviteRoutes.post("/invites/:token/accept", async (c) => {
	const { token } = c.req.param();
	const userId = c.get("userId");

	// Look up the authenticated user's email for the match check
	const [currentUser] = await db.select().from(user).where(eq(user.id, userId));
	if (!currentUser) {
		return c.json({ error: "Could not accept invite" }, 404);
	}

	// Find invite matching both token and email
	const [invite] = await db
		.select()
		.from(invites)
		.where(and(eq(invites.token, token), eq(invites.email, currentUser.email)));

	if (!invite) {
		return c.json({ error: "Invite not found" }, 404);
	}
	if (invite.acceptedAt) {
		return c.json({ error: "Invite already accepted" }, 400);
	}
	if (invite.expiresAt < new Date()) {
		return c.json({ error: "Invite expired" }, 410);
	}

	await db
		.insert(memberships)
		.values({ userId, teamId: invite.teamId, role: "member" });
	await db
		.update(invites)
		.set({ acceptedAt: new Date() })
		.where(eq(invites.id, invite.id));

	// Return the team so the CLI can auto-lock if the user has no active context
	const [team] = await db
		.select()
		.from(teams)
		.where(eq(teams.id, invite.teamId));
	if (!team) {
		return c.json({ error: "Team not found" }, 404);
	}
	return c.json(TeamSelect.parse(team));
});

export { inviteRoutes };
