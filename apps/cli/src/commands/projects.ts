import { confirm, intro, isCancel, log, outro, spinner } from "@clack/prompts";
import type { ProjectSelect } from "@guilloteam/data-ops";
import { defineCommand } from "citty";
import { apiFetch, randomLoadingMessage, readConfig } from "../utilities";

type TaskStats = { open: number; in_progress: number; executed: number; pardoned: number };
type ProjectWithStats = ProjectSelect & { tasks: TaskStats };

const resolveTeam = async (flag: string | undefined): Promise<string> => {
	const teamId = flag ?? (await readConfig()).teamId;
	if (!teamId) {
		process.stderr.write(
			`${JSON.stringify({ error: "No team specified. Use --team <id> or: guillo lock team <id>" })}\n`,
		);
		process.exit(1);
	}
	return teamId;
};

const listCommand = defineCommand({
	meta: { name: "list", description: "List all projects in the active team" },
	args: {
		team: { type: "string", description: "Team ID (overrides locked team)" },
		pretty: {
			type: "boolean",
			description: "Human-readable output",
			default: false,
		},
	},
	async run({ args }) {
		const teamId = await resolveTeam(args.team);
		const pretty = args.pretty || process.stdout.isTTY;

		if (pretty) {
			intro("Projects");
			const s = spinner();
			s.start(randomLoadingMessage());
			const projects = await apiFetch<ProjectSelect[]>(`/teams/${teamId}/projects`);
			s.stop(`Found ${projects.length} project(s)`);
			for (const project of projects) {
				log.info(`${project.name}  ${project.id}`);
			}
			outro("Done");
		} else {
			const projects = await apiFetch<ProjectSelect[]>(`/teams/${teamId}/projects`);
			process.stdout.write(`${JSON.stringify(projects)}\n`);
		}
	},
});

const createCommand = defineCommand({
	meta: { name: "create", description: "Create a new project" },
	args: {
		name: { type: "positional", description: "Project name", required: true },
		team: { type: "string", description: "Team ID (overrides locked team)" },
		pretty: {
			type: "boolean",
			description: "Human-readable output",
			default: false,
		},
	},
	async run({ args }) {
		const teamId = await resolveTeam(args.team);
		const pretty = args.pretty || process.stdout.isTTY;

		if (pretty) {
			intro("Create project");
			const s = spinner();
			s.start(randomLoadingMessage());
			const project = await apiFetch<ProjectSelect>(`/teams/${teamId}/projects`, {
				method: "POST",
				body: JSON.stringify({ name: args.name }),
			});
			s.stop(`Created "${project.name}"`);
			log.info(`ID: ${project.id}`);
			outro("Done");
		} else {
			const project = await apiFetch<ProjectSelect>(`/teams/${teamId}/projects`, {
				method: "POST",
				body: JSON.stringify({ name: args.name }),
			});
			process.stdout.write(`${JSON.stringify(project)}\n`);
		}
	},
});

const getCommand = defineCommand({
	meta: { name: "get", description: "Get a project with task stats" },
	args: {
		id: {
			type: "positional",
			description: "Project ID (defaults to locked project)",
			required: false,
		},
		team: { type: "string", description: "Team ID (overrides locked team)" },
		pretty: {
			type: "boolean",
			description: "Human-readable output",
			default: false,
		},
	},
	async run({ args }) {
		const config = await readConfig();
		const teamId = args.team ?? config.teamId;
		const projectId = args.id ?? config.projectId;
		if (!teamId) {
			process.stderr.write(
				`${JSON.stringify({ error: "No team specified. Use --team <id> or: guillo lock team <id>" })}\n`,
			);
			process.exit(1);
		}
		if (!projectId) {
			process.stderr.write(
				`${JSON.stringify({ error: "No project specified. Use guillo projects get <id> or: guillo lock project <id>" })}\n`,
			);
			process.exit(1);
		}
		const pretty = args.pretty || process.stdout.isTTY;

		if (pretty) {
			intro("Project");
			const s = spinner();
			s.start(randomLoadingMessage());
			const project = await apiFetch<ProjectWithStats>(
				`/teams/${teamId}/projects/${projectId}`,
			);
			s.stop(project.name);
			log.info(`ID: ${project.id}`);
			log.info(`Tasks:`);
			log.info(`  open       ${project.tasks.open}`);
			log.info(`  in_progress  ${project.tasks.in_progress}`);
			log.info(`  executed   ${project.tasks.executed}`);
			log.info(`  pardoned   ${project.tasks.pardoned}`);
			outro("Done");
		} else {
			const project = await apiFetch<ProjectWithStats>(
				`/teams/${teamId}/projects/${projectId}`,
			);
			process.stdout.write(`${JSON.stringify(project)}\n`);
		}
	},
});

const deleteCommand = defineCommand({
	meta: { name: "delete", description: "Delete a project" },
	args: {
		id: { type: "positional", description: "Project ID", required: true },
		team: { type: "string", description: "Team ID (overrides locked team)" },
	},
	async run({ args }) {
		const teamId = await resolveTeam(args.team);

		if (process.stdout.isTTY) {
			const confirmed = await confirm({ message: `Delete project ${args.id}?` });
			if (isCancel(confirmed) || !confirmed) {
				outro("Cancelled");
				process.exit(0);
			}
			const s = spinner();
			s.start(randomLoadingMessage());
			await apiFetch<ProjectSelect>(`/teams/${teamId}/projects/${args.id}`, { method: "DELETE" });
			s.stop("Deleted");
			outro("Done");
		} else {
			const project = await apiFetch<ProjectSelect>(
				`/teams/${teamId}/projects/${args.id}`,
				{ method: "DELETE" },
			);
			process.stdout.write(`${JSON.stringify(project)}\n`);
		}
	},
});

export const projectsCommand = defineCommand({
	meta: { name: "projects", description: "Manage projects" },
	subCommands: {
		list: listCommand,
		get: getCommand,
		create: createCommand,
		delete: deleteCommand,
	},
});
