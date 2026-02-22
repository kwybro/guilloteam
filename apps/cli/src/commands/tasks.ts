import { confirm, intro, isCancel, log, outro, spinner } from "@clack/prompts";
import type { TaskSelect } from "@guilloteam/data-ops";
import { defineCommand } from "citty";
import { apiFetch, randomLoadingMessage, readConfig } from "../utilities";

const resolveContext = async (
	teamFlag: string | undefined,
	projectFlag: string | undefined,
): Promise<{ teamId: string; projectId: string }> => {
	const config = await readConfig();
	const teamId = teamFlag ?? config.teamId;
	const projectId = projectFlag ?? config.projectId;

	if (!teamId) {
		process.stderr.write(
			`${JSON.stringify({ error: "No team specified. Use --team <id> or: guillo lock team <id>" })}\n`,
		);
		process.exit(1);
	}
	if (!projectId) {
		process.stderr.write(
			`${JSON.stringify({ error: "No project specified. Use --project <id> or: guillo lock project <id>" })}\n`,
		);
		process.exit(1);
	}

	return { teamId, projectId };
};

const getCommand = defineCommand({
	meta: { name: "get", description: "Get a single task" },
	args: {
		id: { type: "positional", description: "Task ID", required: true },
		team: { type: "string", description: "Team ID (overrides locked team)" },
		project: { type: "string", description: "Project ID (overrides locked project)" },
		pretty: {
			type: "boolean",
			description: "Human-readable output",
			default: false,
		},
	},
	async run({ args }) {
		const { teamId, projectId } = await resolveContext(args.team, args.project);
		const pretty = args.pretty || process.stdout.isTTY;

		if (pretty) {
			intro("Task");
			const s = spinner();
			s.start(randomLoadingMessage());
			// TODO: task will gain description/context fields in a future update
			const task = await apiFetch<TaskSelect>(
				`/teams/${teamId}/projects/${projectId}/tasks/${args.id}`,
			);
			s.stop(task.title);
			log.info(`ID:      ${task.id}`);
			log.info(`Status:  ${task.status}`);
			outro("Done");
		} else {
			const task = await apiFetch<TaskSelect>(
				`/teams/${teamId}/projects/${projectId}/tasks/${args.id}`,
			);
			process.stdout.write(`${JSON.stringify(task)}\n`);
		}
	},
});

const listCommand = defineCommand({
	meta: { name: "list", description: "List all tasks in the active project" },
	args: {
		team: { type: "string", description: "Team ID (overrides locked team)" },
		project: { type: "string", description: "Project ID (overrides locked project)" },
		pretty: {
			type: "boolean",
			description: "Human-readable output",
			default: false,
		},
	},
	async run({ args }) {
		const { teamId, projectId } = await resolveContext(args.team, args.project);
		const pretty = args.pretty || process.stdout.isTTY;

		if (pretty) {
			intro("Tasks");
			const s = spinner();
			s.start(randomLoadingMessage());
			const tasks = await apiFetch<TaskSelect[]>(
				`/teams/${teamId}/projects/${projectId}/tasks`,
			);
			s.stop(`Found ${tasks.length} task(s)`);
			for (const task of tasks) {
				log.info(`[${task.status}]  ${task.title}  ${task.id}`);
			}
			outro("Done");
		} else {
			const tasks = await apiFetch<TaskSelect[]>(
				`/teams/${teamId}/projects/${projectId}/tasks`,
			);
			process.stdout.write(`${JSON.stringify(tasks)}\n`);
		}
	},
});

const createCommand = defineCommand({
	meta: { name: "create", description: "Create a new task" },
	args: {
		title: { type: "positional", description: "Task title", required: true },
		status: {
			type: "string",
			description: "Initial status: open | in_progress | executed | pardoned",
			default: "open",
		},
		team: { type: "string", description: "Team ID (overrides locked team)" },
		project: { type: "string", description: "Project ID (overrides locked project)" },
		pretty: {
			type: "boolean",
			description: "Human-readable output",
			default: false,
		},
	},
	async run({ args }) {
		const { teamId, projectId } = await resolveContext(args.team, args.project);
		const pretty = args.pretty || process.stdout.isTTY;

		if (pretty) {
			intro("Create task");
			const s = spinner();
			s.start(randomLoadingMessage());
			const task = await apiFetch<TaskSelect>(
				`/teams/${teamId}/projects/${projectId}/tasks`,
				{
					method: "POST",
					body: JSON.stringify({ title: args.title, status: args.status }),
				},
			);
			s.stop(`Created "${task.title}"`);
			log.info(`ID: ${task.id}  Status: ${task.status}`);
			outro("Done");
		} else {
			const task = await apiFetch<TaskSelect>(
				`/teams/${teamId}/projects/${projectId}/tasks`,
				{
					method: "POST",
					body: JSON.stringify({ title: args.title, status: args.status }),
				},
			);
			process.stdout.write(`${JSON.stringify(task)}\n`);
		}
	},
});

const updateCommand = defineCommand({
	meta: { name: "update", description: "Update a task" },
	args: {
		id: { type: "positional", description: "Task ID", required: true },
		title: { type: "string", description: "New title" },
		status: {
			type: "string",
			description: "New status: open | in_progress | executed | pardoned",
		},
		team: { type: "string", description: "Team ID (overrides locked team)" },
		project: { type: "string", description: "Project ID (overrides locked project)" },
		pretty: {
			type: "boolean",
			description: "Human-readable output",
			default: false,
		},
	},
	async run({ args }) {
		if (!args.title && !args.status) {
			process.stderr.write(
				`${JSON.stringify({ error: "Provide at least one of: --title, --status" })}\n`,
			);
			process.exit(1);
		}

		const { teamId, projectId } = await resolveContext(args.team, args.project);
		const pretty = args.pretty || process.stdout.isTTY;
		const updates: Record<string, string> = {};
		if (args.title) updates.title = args.title;
		if (args.status) updates.status = args.status;

		if (pretty) {
			intro("Update task");
			const s = spinner();
			s.start(randomLoadingMessage());
			const task = await apiFetch<TaskSelect>(
				`/teams/${teamId}/projects/${projectId}/tasks/${args.id}`,
				{ method: "PATCH", body: JSON.stringify(updates) },
			);
			s.stop(`Updated "${task.title}"`);
			log.info(`Status: ${task.status}`);
			outro("Done");
		} else {
			const task = await apiFetch<TaskSelect>(
				`/teams/${teamId}/projects/${projectId}/tasks/${args.id}`,
				{ method: "PATCH", body: JSON.stringify(updates) },
			);
			process.stdout.write(`${JSON.stringify(task)}\n`);
		}
	},
});

const deleteCommand = defineCommand({
	meta: { name: "delete", description: "Delete a task" },
	args: {
		id: { type: "positional", description: "Task ID", required: true },
		team: { type: "string", description: "Team ID (overrides locked team)" },
		project: { type: "string", description: "Project ID (overrides locked project)" },
	},
	async run({ args }) {
		const { teamId, projectId } = await resolveContext(args.team, args.project);

		if (process.stdout.isTTY) {
			const confirmed = await confirm({ message: `Delete task ${args.id}?` });
			if (isCancel(confirmed) || !confirmed) {
				outro("Cancelled");
				process.exit(0);
			}
			const s = spinner();
			s.start(randomLoadingMessage());
			await apiFetch<TaskSelect>(
				`/teams/${teamId}/projects/${projectId}/tasks/${args.id}`,
				{ method: "DELETE" },
			);
			s.stop("Deleted");
			outro("Done");
		} else {
			const task = await apiFetch<TaskSelect>(
				`/teams/${teamId}/projects/${projectId}/tasks/${args.id}`,
				{ method: "DELETE" },
			);
			process.stdout.write(`${JSON.stringify(task)}\n`);
		}
	},
});

export const tasksCommand = defineCommand({
	meta: { name: "tasks", description: "Manage tasks" },
	subCommands: {
		list: listCommand,
		get: getCommand,
		create: createCommand,
		update: updateCommand,
		delete: deleteCommand,
	},
});
