import { and, eq, memberships } from "@guilloteam/data-ops";
import { db } from "./db";

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
