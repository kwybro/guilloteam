import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";
import { invites, projects, tasks, teams } from "./db/schema/app";

// Coerce dates so ISO strings from JSON wire format parse as Date objects
const { createSelectSchema, createInsertSchema, createUpdateSchema } =
	createSchemaFactory({ coerce: { date: true } });

// ─── Team ─────────────────────────────────────────────────────────────────────

export const TeamSelect = createSelectSchema(teams);
export type TeamSelect = z.infer<typeof TeamSelect>;

export const TeamInsert = createInsertSchema(teams).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
});
export type TeamInsert = z.infer<typeof TeamInsert>;

export const TeamUpdate = createUpdateSchema(teams)
	.omit({ createdAt: true, updatedAt: true, deletedAt: true })
	.required({ id: true });
export type TeamUpdate = z.infer<typeof TeamUpdate>;

// Validates :id path param for GET/DELETE team routes
export const TeamId = z.object({ id: z.string() });
export type TeamId = z.infer<typeof TeamId>;

// ─── Project ───────────────────────────────────────────────────────────────────

export const ProjectSelect = createSelectSchema(projects);
export type ProjectSelect = z.infer<typeof ProjectSelect>;

export const ProjectInsert = createInsertSchema(projects).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
});
export type ProjectInsert = z.infer<typeof ProjectInsert>;

export const ProjectUpdate = createUpdateSchema(projects)
	.omit({ createdAt: true, updatedAt: true, deletedAt: true })
	.required({ id: true });
export type ProjectUpdate = z.infer<typeof ProjectUpdate>;

export const ProjectId = z.object({ id: z.string() });
export type ProjectId = z.infer<typeof ProjectId>;

// ─── Task ──────────────────────────────────────────────────────────────────────

export const TaskSelect = createSelectSchema(tasks);
export type TaskSelect = z.infer<typeof TaskSelect>;

export const TaskInsert = createInsertSchema(tasks).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	deletedAt: true,
});
export type TaskInsert = z.infer<typeof TaskInsert>;

export const TaskUpdate = createUpdateSchema(tasks)
	.omit({ createdAt: true, updatedAt: true, deletedAt: true })
	.required({ id: true });
export type TaskUpdate = z.infer<typeof TaskUpdate>;

export const TaskId = z.object({ id: z.string() });
export type TaskId = z.infer<typeof TaskId>;

// ─── Invite ────────────────────────────────────────────────────────────────────

export const InviteSelect = createSelectSchema(invites);
export type InviteSelect = z.infer<typeof InviteSelect>;

// Body-only schema: only email comes from the request; teamId/invitedBy/expiresAt are set by the route
export const InviteCreate = createInsertSchema(invites, { email: z.email() }).pick({ email: true });
export type InviteCreate = z.infer<typeof InviteCreate>;

export const InviteId = z.object({ id: z.string() });
export type InviteId = z.infer<typeof InviteId>;
