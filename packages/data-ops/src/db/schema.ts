import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { timestamps } from "./shared";

export const tasks = sqliteTable('tasks', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()).notNull(),
    projectId: text('project_id').notNull(),
    title: text('title').notNull(),
    status: text({ enum: ['open', 'in_progress', 'done', 'cancelled'] }).notNull(),
    ...timestamps
})