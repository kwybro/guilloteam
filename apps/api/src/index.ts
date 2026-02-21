import { Hono } from "hono";
import { auth } from "./auth";
import { projectRoutes } from "./routes/projects";
import { taskRoutes } from "./routes/tasks";
import { teamRoutes } from "./routes/teams";

const app = new Hono();

app.on(["GET", "POST"], "/api/auth/**", (c) => {
	return auth.handler(c.req.raw);
});
app.route("/tasks", taskRoutes);
app.route("/projects", projectRoutes);
app.route("/teams", teamRoutes);

export default app;
