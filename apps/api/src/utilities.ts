import { eq, memberships } from "@guilloteam/data-ops";
import { db } from "./db";

// Returns a subquery of teamIds the user is a member of.
// Use with inArray() to scope queries without a join.
export const userTeamIds = (userId: string) =>
	db
		.select({ teamId: memberships.teamId })
		.from(memberships)
		.where(eq(memberships.userId, userId));
