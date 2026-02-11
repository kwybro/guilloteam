import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./shared";

export const tasks = pgTable("tasks", {
	id: uuid("id").defaultRandom().primaryKey(),
	projectId: uuid("project_id").notNull(),
	title: text("title").notNull(),
	status: text("status", { enum: ["open", "in_progress", "done", "cancelled"] }).notNull(),
	...timestamps,
});