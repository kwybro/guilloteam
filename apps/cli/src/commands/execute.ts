import { intro, outro, spinner } from "@clack/prompts";
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

export const executeCommand = defineCommand({
	meta: { name: "execute", description: "Mark a task as executed" },
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
			intro("Execute task");
			const s = spinner();
			s.start(randomLoadingMessage());
			const task = await apiFetch<TaskSelect>(
				`/teams/${teamId}/projects/${projectId}/tasks/${args.id}`,
				{ method: "PATCH", body: JSON.stringify({ status: "executed" }) },
			);
			s.stop(`"${task.title}" — Executed`);
			outro("Done");
		} else {
			const task = await apiFetch<TaskSelect>(
				`/teams/${teamId}/projects/${projectId}/tasks/${args.id}`,
				{ method: "PATCH", body: JSON.stringify({ status: "executed" }) },
			);
			process.stdout.write(`${JSON.stringify(task)}\n`);
		}
	},
});
