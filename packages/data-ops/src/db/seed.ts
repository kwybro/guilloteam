import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { projects, tasks, teams } from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	throw new Error("Missing DATABASE_URL environment variable");
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

const seedTeam = {
	name: "The OG"
}

const seedProject = (teamId: string) => {
	return {
		teamId,
		name: "Initial project"
	}
}

const seedTasks = (projectId: string) => {
	return [
		{
			projectId,
			title: "Set up CI/CD pipeline",
			status: "open" as const,
		},
		{
			projectId,
			title: "Write API documentation",
			status: "in_progress" as const,
		},
		{
			projectId,
			title: "Design database schema",
			status: "done" as const,
		},
		{
			projectId,
			title: "Create landing page",
			status: "open" as const,
		},
		{
			projectId,
			title: "Fix login redirect bug",
			status: "cancelled" as const,
		},
	];
};

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

await client.end();
