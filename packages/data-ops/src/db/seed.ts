import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { projects, tasks, teams } from "./schema/app";

const LIBSQL_URL = process.env.LIBSQL_URL;
if (!LIBSQL_URL) {
	throw new Error("Missing LIBSQL_URL environment variable");
}

const client = createClient({ url: LIBSQL_URL });
const db = drizzle(client);

const seedTeam = {
	name: "The OG",
};

const seedProject = (teamId: string) => ({
	teamId,
	name: "Initial project",
});

const seedTasks = (projectId: string) => [
	{ projectId, title: "Set up CI/CD pipeline", status: "open" as const },
	{ projectId, title: "Write API documentation", status: "in_progress" as const },
	{ projectId, title: "Design database schema", status: "done" as const },
	{ projectId, title: "Create landing page", status: "open" as const },
	{ projectId, title: "Fix login redirect bug", status: "cancelled" as const },
];

console.log("Seeding a team, a project, and some tasks...");

// Clear existing data
await db.delete(tasks);
await db.delete(projects);
await db.delete(teams);

// Insert seed data
const newTeams = await db.insert(teams).values(seedTeam).returning();
const newProjects = await db.insert(projects).values(seedProject(newTeams[0].id)).returning();
const newTasks = await db.insert(tasks).values(seedTasks(newProjects[0].id)).returning();

console.log(`Seeded ${newTeams.length} teams:`);
console.table(newTeams);
console.log(`Seeded ${newProjects.length} projects:`);
console.table(newProjects);
console.log(`Seeded ${newTasks.length} tasks:`);
console.table(newTasks);
