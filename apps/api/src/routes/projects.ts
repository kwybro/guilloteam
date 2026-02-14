import { eq, isNull, projects } from "@guilloteam/data-ops";
import { CreateProject, DeleteProject, GetProject, UpdateProject } from "@guilloteam/schemas";
import { Hono } from "hono";
import { db } from "../db";

const projectRoutes = new Hono();

// GET /projects — list all projects
projectRoutes.get("/", async (c) => {
	const result = await db.select().from(projects).where(isNull(projects.deletedAt));
	return c.json(result);
});

// GET /projects/:id — get a single project
projectRoutes.get("/:id", async (c) => {
	const { id } = c.req.param();
	const parsed = GetProject.safeParse({ id });
	if (!parsed.success) {
		return c.json({ error: parsed.error.flatten() }, 400);
	}
	const [project] = await db
		.select()
		.from(projects)
		.where(eq(projects.id, parsed.data.id));
	if (!project) {
		return c.json({ error: "Project not found" }, 404);
	}
	return c.json(project);
});

// POST /projects — create a project
projectRoutes.post("/", async (c) => {
	const body = await c.req.json();
	const parsed = CreateProject.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: parsed.error.flatten() }, 400);
	}
	const [project] = await db.insert(projects).values(parsed.data).returning();
	return c.json(project, 201);
});

// PATCH /projects/:id — update a project
projectRoutes.patch("/:id", async (c) => {
	const { id } = c.req.param();
	const body = await c.req.json();
	const parsed = UpdateProject.safeParse({ ...body, id });
	if (!parsed.success) {
		return c.json({ error: parsed.error.flatten() }, 400);
	}
	const { id: projectId, ...updates } = parsed.data;
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

// DELETE /projects/:id — soft delete (sets deletedAt)
projectRoutes.delete("/:id", async (c) => {
	const { id } = c.req.param();
	const parsed = DeleteProject.safeParse({ id });
	if (!parsed.success) {
		return c.json({ error: parsed.error.flatten() }, 400);
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