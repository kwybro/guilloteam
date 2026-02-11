import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { tasks } from "./schema";

const DB_PATH =
	"../../apps/api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/d7e7dad26bda2eb41e10f2b5b0776873c53023ab37e537e0aca2622a0a57c851.sqlite";

const sqlite = new Database(DB_PATH);
const db = drizzle(sqlite);

const seedTasks = [
	{
		projectId: "00000000-0000-0000-0000-000000000001",
		title: "Set up CI/CD pipeline",
		status: "open" as const,
	},
	{
		projectId: "00000000-0000-0000-0000-000000000001",
		title: "Write API documentation",
		status: "in_progress" as const,
	},
	{
		projectId: "00000000-0000-0000-0000-000000000001",
		title: "Design database schema",
		status: "done" as const,
	},
	{
		projectId: "00000000-0000-0000-0000-000000000002",
		title: "Create landing page",
		status: "open" as const,
	},
	{
		projectId: "00000000-0000-0000-0000-000000000002",
		title: "Fix login redirect bug",
		status: "cancelled" as const,
	},
];

console.log("Seeding tasks...");

// Clear existing data
db.delete(tasks).run();

// Insert seed data
for (const task of seedTasks) {
	db.insert(tasks).values(task).run();
}

const allTasks = db.select().from(tasks).all();
console.log(`Seeded ${allTasks.length} tasks:`);
console.table(allTasks);

sqlite.close();
