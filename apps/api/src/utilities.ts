import { and, eq, memberships } from "@guilloteam/data-ops";
import { flattenError } from "@guilloteam/schemas";
import type { Hook } from "@hono/zod-validator";
import { db } from "./db";

// Returns a 400 with flattened Zod errors; used as the zValidator hook across routes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validatorHook: Hook<any, any, any, any> = (result, c) => {
	// Cast needed: @hono/zod-validator types expose a v3|v4 error union at compile time
	// but at runtime we're on Zod v4, so flattenError works correctly.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	if (!result.success) return c.json({ error: flattenError(result.error as any) }, 400);
};

// Returns a subquery of teamIds the user is a member of.
// Use with inArray() to scope queries without a join.
export const userTeamIds = (userId: string) =>
	db
		.select({ teamId: memberships.teamId })
		.from(memberships)
		.where(eq(memberships.userId, userId));

// Returns true if the user is an owner of the given team.
export const isTeamOwner = async (userId: string, teamId: string) => {
	const [membership] = await db
		.select()
		.from(memberships)
		.where(and(eq(memberships.userId, userId), eq(memberships.teamId, teamId), eq(memberships.role, "owner")));
	return membership !== undefined;
};
