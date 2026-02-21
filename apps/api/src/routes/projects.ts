import { and, eq, inArray, isNull, memberships, projects } from "@guilloteam/data-ops";
import {
	CreateProject,
	DeleteProject,
	flattenError,
	GetProject,
	UpdateProject,
} from "@guilloteam/schemas";
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
		.where(and(eq(projects.teamId, teamId), inArray(projects.teamId, userTeamIds(userId)), isNull(projects.deletedAt)));
	return c.json(result);
});

// GET /teams/:teamId/projects/:id
projectRoutes.get("/:teamId/projects/:id", async (c) => {
	const userId = c.get("userId");
	const { teamId, id } = c.req.param();
	const parsed = GetProject.safeParse({ id });
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}
	const [project] = await db
		.select()
		.from(projects)
		.where(and(eq(projects.teamId, teamId), eq(projects.id, parsed.data.id), inArray(projects.teamId, userTeamIds(userId)), isNull(projects.deletedAt)));
	if (!project) {
		return c.json({ error: "Project not found" }, 404);
	}
	return c.json(project);
});

// POST /teams/:teamId/projects
projectRoutes.post("/:teamId/projects", async (c) => {
	const userId = c.get("userId");
	const { teamId } = c.req.param();
	const body = await c.req.json();
	const parsed = CreateProject.safeParse({ ...body, teamId });
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
	return c.json(project, 201);
});

// PATCH /teams/:teamId/projects/:id
projectRoutes.patch("/:teamId/projects/:id", async (c) => {
	const userId = c.get("userId");
	const { teamId, id } = c.req.param();
	const body = await c.req.json();
	const parsed = UpdateProject.safeParse({ ...body, id });
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}
	const { id: projectId, ...updates } = parsed.data;
	const [existing] = await db
		.select()
		.from(projects)
		.where(and(eq(projects.teamId, teamId), eq(projects.id, projectId), inArray(projects.teamId, userTeamIds(userId)), isNull(projects.deletedAt)));
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
	return c.json(project);
});

// DELETE /teams/:teamId/projects/:id
projectRoutes.delete("/:teamId/projects/:id", async (c) => {
	const userId = c.get("userId");
	const { teamId, id } = c.req.param();
	const parsed = DeleteProject.safeParse({ id });
	if (!parsed.success) {
		return c.json({ error: flattenError(parsed.error) }, 400);
	}
	const [existing] = await db
		.select()
		.from(projects)
		.where(and(eq(projects.teamId, teamId), eq(projects.id, parsed.data.id), inArray(projects.teamId, userTeamIds(userId)), isNull(projects.deletedAt)));
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
	return c.json(project);
});

export { projectRoutes };
