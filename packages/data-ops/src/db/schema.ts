import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./shared";

export const tasks = pgTable("tasks", {
	id: uuid("id").defaultRandom().primaryKey(),
	projectId: uuid("project_id").notNull(),
	title: text("title").notNull(),
	status: text("status", { enum: ["open", "in_progress", "done", "cancelled"] }).notNull(),
	...timestamps,
});

export const projects = pgTable("projects", {
	id: uuid("id").defaultRandom().primaryKey(),
	teamId: uuid("team_id").notNull(),
	name: text("name").notNull(),
	...timestamps,
});

export const teams = pgTable("teams", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull(),
	...timestamps,
});