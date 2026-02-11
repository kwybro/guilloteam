import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { tasks } from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	throw new Error("Missing DATABASE_URL environment variable");
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

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
await db.delete(tasks);

// Insert seed data
await db.insert(tasks).values(seedTasks);

const allTasks = await db.select().from(tasks);
console.log(`Seeded ${allTasks.length} tasks:`);
console.table(allTasks);

await client.end();
