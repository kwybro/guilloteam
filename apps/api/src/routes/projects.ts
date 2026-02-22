import {
	and,
	count,
	eq,
	inArray,
	isNull,
	memberships,
	ProjectId,
	ProjectInsert,
	ProjectSelect,
	ProjectUpdate,
	projects,
	tasks,
} from "@guilloteam/data-ops";
import { flattenError } from "@guilloteam/schemas";
import { Hono } from "hono";
import { db } from "../db";
import { authMiddleware, type Variables } from "../middleware/auth";
import { userTeamIds } from "../utilities";

const projectRoutes = new Hono<{ Variables: Variables }>();
projectRoutes.use(authMiddleware);

// GET /teams/:teamId/projects
projectRoutes.get("/:teamId/projects", async (c) => {
	const userId = c.get("userId");
	const { teamId } = c.req.param();
	const result = await db
		.select()
		.from(projects)
		.where(
			and(
				eq(projects.teamId, teamId),
				inArray(projects.teamId, userTeamIds(userId)),
				isNull(projects.deletedAt),
			),
		);
	return c.json(ProjectSelect.array().parse(result));
});

// GET /teams/:teamId/projects/:id
projectRoutes.get("/:teamId/projects/:id", async (c) => {
	const userId = c.get("userId");
	const { teamId, id } = c.req.param();
	const parsed = ProjectId.safeParse({ id });
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}
	const [project] = await db
		.select()
		.from(projects)
		.where(
			and(
				eq(projects.teamId, teamId),
				eq(projects.id, parsed.data.id),
				inArray(projects.teamId, userTeamIds(userId)),
				isNull(projects.deletedAt),
			),
		);
	if (!project) {
		return c.json({ error: "Project not found" }, 404);
	}
	const taskCounts = await db
		.select({ status: tasks.status, count: count() })
		.from(tasks)
		.where(and(eq(tasks.projectId, parsed.data.id), isNull(tasks.deletedAt)))
		.groupBy(tasks.status);
	const taskStats: Record<"open" | "in_progress" | "executed" | "pardoned", number> = {
		open: 0,
		in_progress: 0,
		executed: 0,
		pardoned: 0,
	};
	for (const row of taskCounts) {
		taskStats[row.status] = row.count;
	}
	return c.json({ ...ProjectSelect.parse(project), tasks: taskStats });
});

// POST /teams/:teamId/projects
projectRoutes.post("/:teamId/projects", async (c) => {
	const userId = c.get("userId");
	const { teamId } = c.req.param();
	const body = await c.req.json();
	const parsed = ProjectInsert.safeParse({ ...body, teamId });
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}
	const [membership] = await db
		.select()
		.from(memberships)
		.where(and(eq(memberships.teamId, teamId), eq(memberships.userId, userId)));
	if (!membership) {
		return c.json({ error: "Team not found" }, 404);
	}
	const [project] = await db.insert(projects).values(parsed.data).returning();
	if (!project) {
		return c.json({ error: "Could not create Project" }, 500);
	}
	return c.json(ProjectSelect.parse(project), 201);
});

// PATCH /teams/:teamId/projects/:id
projectRoutes.patch("/:teamId/projects/:id", async (c) => {
	const userId = c.get("userId");
	const { teamId, id } = c.req.param();
	const body = await c.req.json();
	const parsed = ProjectUpdate.safeParse({ ...body, id });
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}
	const { id: projectId, ...updates } = parsed.data;
	const [existing] = await db
		.select()
		.from(projects)
		.where(
			and(
				eq(projects.teamId, teamId),
				eq(projects.id, projectId),
				inArray(projects.teamId, userTeamIds(userId)),
				isNull(projects.deletedAt),
			),
		);
	if (!existing) {
		return c.json({ error: "Project not found" }, 404);
	}
	const [project] = await db
		.update(projects)
		.set({ ...updates, updatedAt: new Date() })
		.where(eq(projects.id, projectId))
		.returning();
	if (!project) {
		return c.json({ error: "Project not found" }, 404);
	}
	return c.json(ProjectSelect.parse(project));
});

// DELETE /teams/:teamId/projects/:id
projectRoutes.delete("/:teamId/projects/:id", async (c) => {
	const userId = c.get("userId");
	const { teamId, id } = c.req.param();
	const parsed = ProjectId.safeParse({ id });
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}
	const [existing] = await db
		.select()
		.from(projects)
		.where(
			and(
				eq(projects.teamId, teamId),
				eq(projects.id, parsed.data.id),
				inArray(projects.teamId, userTeamIds(userId)),
				isNull(projects.deletedAt),
			),
		);
	if (!existing) {
		return c.json({ error: "Project not found" }, 404);
	}
	const [project] = await db
		.update(projects)
		.set({ deletedAt: new Date() })
		.where(eq(projects.id, parsed.data.id))
		.returning();
	if (!project) {
		return c.json({ error: "Project not found" }, 404);
	}
	return c.json(ProjectSelect.parse(project));
});

export { projectRoutes };
