import { eq, isNull, tasks } from "@guilloteam/data-ops";
import {
	CreateTask,
	DeleteTask,
	flattenError,
	GetTask,
	UpdateTask,
} from "@guilloteam/schemas";
import { Hono } from "hono";
import { db } from "../db";

const taskRoutes = new Hono();

// GET /tasks — list all tasks
taskRoutes.get("/", async (c) => {
	const result = await db.select().from(tasks).where(isNull(tasks.deletedAt));
	return c.json(result);
});

// GET /tasks/:id — get a single task
taskRoutes.get("/:id", async (c) => {
	const { id } = c.req.param();
	const parsed = GetTask.safeParse({ id });
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}
	const [task] = await db
		.select()
		.from(tasks)
		.where(eq(tasks.id, parsed.data.id));
	if (!task) {
		return c.json({ error: "Task not found" }, 404);
	}
	return c.json(task);
});

// POST /tasks — create a task
taskRoutes.post("/", async (c) => {
	const body = await c.req.json();
	const parsed = CreateTask.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}
	const [task] = await db.insert(tasks).values(parsed.data).returning();
	return c.json(task, 201);
});

// PATCH /tasks/:id — update a task
taskRoutes.patch("/:id", async (c) => {
	const { id } = c.req.param();
	const body = await c.req.json();
	const parsed = UpdateTask.safeParse({ ...body, id });
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}
	const { id: taskId, ...updates } = parsed.data;
	const [task] = await db
		.update(tasks)
		.set({ ...updates, updatedAt: new Date() })
		.where(eq(tasks.id, taskId))
		.returning();
	if (!task) {
		return c.json({ error: "Task not found" }, 404);
	}
	return c.json(task);
});

// DELETE /tasks/:id — soft delete (sets deletedAt)
taskRoutes.delete("/:id", async (c) => {
	const { id } = c.req.param();
	const parsed = DeleteTask.safeParse({ id });
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}
	const [task] = await db
		.update(tasks)
		.set({ deletedAt: new Date() })
		.where(eq(tasks.id, parsed.data.id))
		.returning();
	if (!task) {
		return c.json({ error: "Task not found" }, 404);
	}
	return c.json(task);
});

export { taskRoutes };
