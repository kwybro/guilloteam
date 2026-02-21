import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { timestamps } from "../shared";
import { user } from './auth'

export const teams = sqliteTable("teams", {
	id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
	name: text("name").notNull(),
	...timestamps,
});

export const memberships = sqliteTable("memberships", {
	id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	teamId: text("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
	role: text("role", { enum: ["owner", "member"] }).notNull().default("member"),
	...timestamps,
});

export const projects = sqliteTable("projects", {
	id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
	teamId: text("team_id").notNull().references(() => teams.id, { onDelete: "restrict" }),
	name: text("name").notNull(),
	...timestamps,
});

export const tasks = sqliteTable("tasks", {
	id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
	projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
	title: text("title").notNull(),
	status: text("status", { enum: ["open", "in_progress", "done", "cancelled"] }).notNull(),
	...timestamps,
});
