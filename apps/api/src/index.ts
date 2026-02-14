import { Hono } from 'hono';
import { taskRoutes } from './routes/tasks';

const app = new Hono();
app.route("/tasks", taskRoutes);

export default app;