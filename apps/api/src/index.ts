import { Hono } from "hono";
import { projectRoutes } from "./routes/projects";
import { taskRoutes } from "./routes/tasks";
import { teamRoutes } from "./routes/teams";

const app = new Hono();
app.route("/tasks", taskRoutes);
app.route("/projects", projectRoutes);
app.route("/teams", teamRoutes);

export default app;