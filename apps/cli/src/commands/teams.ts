import { confirm, intro, isCancel, log, outro, spinner } from "@clack/prompts";
import type { TeamSelect } from "@guilloteam/data-ops";
import { defineCommand } from "citty";
import { apiFetch, randomLoadingMessage, readConfig } from "../utilities";

type TeamWithMembers = TeamSelect & {
	members: { userId: string; email: string; role: string }[];
};

const listCommand = defineCommand({
	meta: { name: "list", description: "List all teams" },
	args: {
		pretty: {
			type: "boolean",
			description: "Human-readable output",
			default: false,
		},
	},
	async run({ args }) {
		const pretty = args.pretty || process.stdout.isTTY;

		if (pretty) {
			intro("Teams");
			const s = spinner();
			s.start(randomLoadingMessage());
			const teams = await apiFetch<TeamSelect[]>("/teams");
			s.stop(`Found ${teams.length} team(s)`);
			for (const team of teams) {
				log.info(`${team.name}  ${team.id}`);
			}
			outro("Done");
		} else {
			const teams = await apiFetch<TeamSelect[]>("/teams");
			process.stdout.write(`${JSON.stringify(teams)}\n`);
		}
	},
});

const createCommand = defineCommand({
	meta: { name: "create", description: "Create a new team" },
	args: {
		name: { type: "positional", description: "Team name", required: true },
		pretty: {
			type: "boolean",
			description: "Human-readable output",
			default: false,
		},
	},
	async run({ args }) {
		const pretty = args.pretty || process.stdout.isTTY;

		if (pretty) {
			intro("Create team");
			const s = spinner();
			s.start(randomLoadingMessage());
			const team = await apiFetch<TeamSelect>("/teams", {
				method: "POST",
				body: JSON.stringify({ name: args.name }),
			});
			s.stop(`Created "${team.name}"`);
			log.info(`ID: ${team.id}`);
			outro("Done");
		} else {
			const team = await apiFetch<TeamSelect>("/teams", {
				method: "POST",
				body: JSON.stringify({ name: args.name }),
			});
			process.stdout.write(`${JSON.stringify(team)}\n`);
		}
	},
});

const updateCommand = defineCommand({
	meta: { name: "update", description: "Update an existing team" },
	args: {
		id: {
			type: "positional",
			description: "Team ID (defaults to locked team)",
			required: false,
		},
		name: {
			type: "string",
			description: "Team name",
			required: true,
		},
		pretty: {
			type: "boolean",
			description: "Human-readable output",
			default: false,
		},
	},
	async run({ args }) {
		const config = await readConfig();
		const teamId = args.id ?? config.teamId;
		if (!teamId) {
			process.stderr.write(
				`${JSON.stringify({ error: "No team specified. Use guillo teams update <id> or: guillo lock team <id>" })}\n`,
			);
			process.exit(1);
		}
		const pretty = args.pretty || process.stdout.isTTY;

		if (pretty) {
			intro("Update team");
			const s = spinner();
			s.start(randomLoadingMessage());
			const team = await apiFetch<TeamSelect>(`/teams/${teamId}`, {
				method: "PATCH",
				body: JSON.stringify({ name: args.name }),
			});
			s.stop(`Updated "${team.name}"`);
			log.info(`ID: ${team.id}`);
			outro("Done");
		} else {
			const team = await apiFetch<TeamSelect>(`/teams/${teamId}`, {
				method: "PATCH",
				body: JSON.stringify({ name: args.name }),
			});
			process.stdout.write(`${JSON.stringify(team)}\n`);
		}
	},
});

const getCommand = defineCommand({
	meta: { name: "get", description: "Get a team with its members" },
	args: {
		id: {
			type: "positional",
			description: "Team ID (defaults to locked team)",
			required: false,
		},
		pretty: {
			type: "boolean",
			description: "Human-readable output",
			default: false,
		},
	},
	async run({ args }) {
		const config = await readConfig();
		const teamId = args.id ?? config.teamId;
		if (!teamId) {
			process.stderr.write(
				`${JSON.stringify({ error: "No team specified. Use guillo teams get <id> or: guillo lock team <id>" })}\n`,
			);
			process.exit(1);
		}
		const pretty = args.pretty || process.stdout.isTTY;

		if (pretty) {
			intro("Team");
			const s = spinner();
			s.start(randomLoadingMessage());
			const team = await apiFetch<TeamWithMembers>(`/teams/${teamId}`);
			s.stop(team.name);
			log.info(`ID: ${team.id}`);
			log.info(`Members (${team.members.length}):`);
			for (const m of team.members) {
				log.info(`  ${m.role.padEnd(8)}  ${m.email}  ${m.userId}`);
			}
			outro("Done");
		} else {
			const team = await apiFetch<TeamWithMembers>(`/teams/${teamId}`);
			process.stdout.write(`${JSON.stringify(team)}\n`);
		}
	},
});

const deleteCommand = defineCommand({
	meta: { name: "delete", description: "Delete a team" },
	args: {
		id: { type: "positional", description: "Team ID", required: true },
	},
	async run({ args }) {
		if (process.stdout.isTTY) {
			const confirmed = await confirm({ message: `Delete team ${args.id}?` });
			if (isCancel(confirmed) || !confirmed) {
				outro("Cancelled");
				process.exit(0);
			}
			const s = spinner();
			s.start(randomLoadingMessage());
			await apiFetch<TeamSelect>(`/teams/${args.id}`, { method: "DELETE" });
			s.stop("Deleted");
			outro("Done");
		} else {
			const team = await apiFetch<TeamSelect>(`/teams/${args.id}`, { method: "DELETE" });
			process.stdout.write(`${JSON.stringify(team)}\n`);
		}
	},
});

export const teamsCommand = defineCommand({
	meta: { name: "teams", description: "Manage teams" },
	subCommands: {
		list: listCommand,
		get: getCommand,
		create: createCommand,
		update: updateCommand,
		delete: deleteCommand,
	},
});
