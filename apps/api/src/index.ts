import { Hono } from "hono";
import { auth } from "./auth";
import { authRoutes } from "./routes/auth";
import { inviteRoutes } from "./routes/invites";
import { projectRoutes } from "./routes/projects";
import { taskRoutes } from "./routes/tasks";
import { teamRoutes } from "./routes/teams";

const app = new Hono();

app.on(["GET", "POST"], "/api/auth/**", (c) => {
	return auth.handler(c.req.raw);
});

// Light wrapper around some better-auth server
// functions tailor made for the CLI.
app.route("/auth", authRoutes);

app.route("/", inviteRoutes);

// Note: all routes internally are scoped to a team
app.route("/teams", teamRoutes);
app.route("/teams", projectRoutes);
app.route("/teams", taskRoutes);

export default app;
