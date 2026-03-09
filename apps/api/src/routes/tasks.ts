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
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { db } from "../db";
import { authMiddleware, type Variables } from "../middleware/auth";
import { userTeamIds, validatorHook } from "../utilities";

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
taskRoutes.get("/:teamId/projects/:projectId/tasks/:id", zValidator("param", TaskId, validatorHook), async (c) => {
	const userId = c.get("userId");
	const { projectId } = c.req.param();
	const { id } = c.req.valid("param");
	const [task] = await db
		.select(getTableColumns(tasks))
		.from(tasks)
		.innerJoin(projects, eq(projects.id, tasks.projectId))
		.where(
			and(
				eq(tasks.projectId, projectId),
				eq(tasks.id, id),
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
taskRoutes.post("/:teamId/projects/:projectId/tasks", zValidator("json", TaskInsert, validatorHook), async (c) => {
	const userId = c.get("userId");
	const { projectId } = c.req.param();
	const body = c.req.valid("json");
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
	const [task] = await db.insert(tasks).values({ ...body, projectId }).returning();
	if (!task) {
		return c.json({ error: "Could not create Task" }, 500);
	}
	return c.json(TaskSelect.parse(task), 201);
});

// PATCH /teams/:teamId/projects/:projectId/tasks/:id
taskRoutes.patch("/:teamId/projects/:projectId/tasks/:id", zValidator("json", TaskUpdate, validatorHook), async (c) => {
	const userId = c.get("userId");
	const { projectId, id } = c.req.param();
	const updates = c.req.valid("json");
	const [existing] = await db
		.select(getTableColumns(tasks))
		.from(tasks)
		.innerJoin(projects, eq(projects.id, tasks.projectId))
		.where(
			and(
				eq(tasks.projectId, projectId),
				eq(tasks.id, id),
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
		.where(eq(tasks.id, id))
		.returning();
	if (!task) {
		return c.json({ error: "Task not found" }, 404);
	}
	return c.json(TaskSelect.parse(task));
});

// DELETE /teams/:teamId/projects/:projectId/tasks/:id
taskRoutes.delete("/:teamId/projects/:projectId/tasks/:id", zValidator("param", TaskId, validatorHook), async (c) => {
	const userId = c.get("userId");
	const { projectId } = c.req.param();
	const { id } = c.req.valid("param");
	const [existing] = await db
		.select(getTableColumns(tasks))
		.from(tasks)
		.innerJoin(projects, eq(projects.id, tasks.projectId))
		.where(
			and(
				eq(tasks.projectId, projectId),
				eq(tasks.id, id),
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
		.where(eq(tasks.id, id))
		.returning();
	if (!task) {
		return c.json({ error: "Task not found" }, 404);
	}
	return c.json(TaskSelect.parse(task));
});

export { taskRoutes };
