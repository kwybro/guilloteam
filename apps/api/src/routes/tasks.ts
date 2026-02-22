import {
	and,
	eq,
	getTableColumns,
	inArray,
	isNull,
	projects,
	TaskId,
	TaskInsert,
	TaskSelect,
	TaskUpdate,
	tasks,
} from "@guilloteam/data-ops";
import { flattenError } from "@guilloteam/schemas";
import { Hono } from "hono";
import { db } from "../db";
import { authMiddleware, type Variables } from "../middleware/auth";
import { userTeamIds } from "../utilities";

const taskRoutes = new Hono<{ Variables: Variables }>();
taskRoutes.use(authMiddleware);

// GET /teams/:teamId/projects/:projectId/tasks
taskRoutes.get("/:teamId/projects/:projectId/tasks", async (c) => {
	const userId = c.get("userId");
	const { projectId } = c.req.param();
	const result = await db
		.select(getTableColumns(tasks))
		.from(tasks)
		.innerJoin(projects, eq(projects.id, tasks.projectId))
		.where(
			and(
				eq(tasks.projectId, projectId),
				inArray(projects.teamId, userTeamIds(userId)),
				isNull(tasks.deletedAt),
			),
		);
	return c.json(TaskSelect.array().parse(result));
});

// GET /teams/:teamId/projects/:projectId/tasks/:id
taskRoutes.get("/:teamId/projects/:projectId/tasks/:id", async (c) => {
	const userId = c.get("userId");
	const { projectId, id } = c.req.param();
	const parsed = TaskId.safeParse({ id });
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}
	const [task] = await db
		.select(getTableColumns(tasks))
		.from(tasks)
		.innerJoin(projects, eq(projects.id, tasks.projectId))
		.where(
			and(
				eq(tasks.projectId, projectId),
				eq(tasks.id, parsed.data.id),
				inArray(projects.teamId, userTeamIds(userId)),
				isNull(tasks.deletedAt),
			),
		);
	if (!task) {
		return c.json({ error: "Task not found" }, 404);
	}
	return c.json(TaskSelect.parse(task));
});

// POST /teams/:teamId/projects/:projectId/tasks
taskRoutes.post("/:teamId/projects/:projectId/tasks", async (c) => {
	const userId = c.get("userId");
	const { projectId } = c.req.param();
	const body = await c.req.json();
	const parsed = TaskInsert.safeParse({ ...body, projectId });
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}
	const [project] = await db
		.select()
		.from(projects)
		.where(
			and(
				eq(projects.id, projectId),
				inArray(projects.teamId, userTeamIds(userId)),
				isNull(projects.deletedAt),
			),
		);
	if (!project) {
		return c.json({ error: "Project not found" }, 404);
	}
	const [task] = await db.insert(tasks).values(parsed.data).returning();
	if (!task) {
		return c.json({ error: "Could not create Task" }, 500);
	}
	return c.json(TaskSelect.parse(task), 201);
});

// PATCH /teams/:teamId/projects/:projectId/tasks/:id
taskRoutes.patch("/:teamId/projects/:projectId/tasks/:id", async (c) => {
	const userId = c.get("userId");
	const { projectId, id } = c.req.param();
	const body = await c.req.json();
	const parsed = TaskUpdate.safeParse({ ...body, id });
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}
	const { id: taskId, ...updates } = parsed.data;
	const [existing] = await db
		.select(getTableColumns(tasks))
		.from(tasks)
		.innerJoin(projects, eq(projects.id, tasks.projectId))
		.where(
			and(
				eq(tasks.projectId, projectId),
				eq(tasks.id, taskId),
				inArray(projects.teamId, userTeamIds(userId)),
				isNull(tasks.deletedAt),
			),
		);
	if (!existing) {
		return c.json({ error: "Task not found" }, 404);
	}
	const [task] = await db
		.update(tasks)
		.set({ ...updates, updatedAt: new Date() })
		.where(eq(tasks.id, taskId))
		.returning();
	if (!task) {
		return c.json({ error: "Task not found" }, 404);
	}
	return c.json(TaskSelect.parse(task));
});

// DELETE /teams/:teamId/projects/:projectId/tasks/:id
taskRoutes.delete("/:teamId/projects/:projectId/tasks/:id", async (c) => {
	const userId = c.get("userId");
	const { projectId, id } = c.req.param();
	const parsed = TaskId.safeParse({ id });
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}
	const [existing] = await db
		.select(getTableColumns(tasks))
		.from(tasks)
		.innerJoin(projects, eq(projects.id, tasks.projectId))
		.where(
			and(
				eq(tasks.projectId, projectId),
				eq(tasks.id, parsed.data.id),
				inArray(projects.teamId, userTeamIds(userId)),
				isNull(tasks.deletedAt),
			),
		);
	if (!existing) {
		return c.json({ error: "Task not found" }, 404);
	}
	const [task] = await db
		.update(tasks)
		.set({ deletedAt: new Date() })
		.where(eq(tasks.id, parsed.data.id))
		.returning();
	if (!task) {
		return c.json({ error: "Task not found" }, 404);
	}
	return c.json(TaskSelect.parse(task));
});

export { taskRoutes };
