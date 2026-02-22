import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { timestamps } from "../shared";
import { user } from "./auth";

export const teams = sqliteTable("teams", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text("name").notNull(),
	...timestamps,
});

export const memberships = sqliteTable("memberships", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	teamId: text("team_id")
		.notNull()
		.references(() => teams.id, { onDelete: "cascade" }),
	role: text("role", { enum: ["owner", "member"] })
		.notNull()
		.default("member"),
	...timestamps,
});

export const projects = sqliteTable("projects", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	teamId: text("team_id")
		.notNull()
		.references(() => teams.id, { onDelete: "restrict" }),
	name: text("name").notNull(),
	...timestamps,
});

export const tasks = sqliteTable("tasks", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "restrict" }),
	title: text("title").notNull(),
	status: text("status", {
		enum: ["open", "in_progress", "executed", "pardoned"],
	}).notNull(),
	...timestamps,
});

export const invites = sqliteTable("invites", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	teamId: text("team_id")
		.notNull()
		.references(() => teams.id, { onDelete: "cascade" }),
	email: text("email").notNull(),
	token: text("token")
		.notNull()
		.unique()
		.$defaultFn(() => `gt_inv_${crypto.randomUUID()}`),
	invitedBy: text("invited_by")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	acceptedAt: integer("accepted_at", { mode: "timestamp" }),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});
