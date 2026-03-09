import { and, eq, memberships } from "@guilloteam/data-ops";
import { flattenError } from "@guilloteam/schemas";
import type { Hook } from "@hono/zod-validator";
import type { $ZodError } from "zod/v4/core";
import { db } from "./db";

// Returns a 400 with flattened Zod errors; used as the zValidator hook across routes.
// Hook<any, any, any, any>: T, E, and P vary per route; TypeScript doesn't support
// generic values (only generic functions), so any is correct for a shared hook constant.
// The error cast: @hono/zod-validator types error as v3.ZodError | v4.$ZodError since it
// supports both, but flattenError only accepts $ZodError. We're on v4 so the cast is safe.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validatorHook: Hook<any, any, any, any> = (result, c) => {
	if (!result.success) return c.json({ error: flattenError(result.error as $ZodError) }, 400);
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
