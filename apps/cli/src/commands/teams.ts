import { intro, log, outro, spinner } from "@clack/prompts";
import { defineCommand } from "citty";

export type Team = {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
};

export const listTeams = async (baseUrl: string): Promise<Team[]> => {
	const res = await fetch(`${baseUrl}/teams`);
	if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
	return res.json() as Promise<Team[]>;
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
		const baseUrl = process.env.GUILLOTEAM_API_URL ?? "http://localhost:3000";
		const pretty = args.pretty || process.stdout.isTTY;

		if (pretty) {
			intro("Teams");
			const s = spinner();
			s.start("Fetching teams...");
			const teams = await listTeams(baseUrl);
			s.stop(`Found ${teams.length} team(s)`);
			for (const team of teams) {
				log.info(`${team.name}  ${team.id}`);
			}
			outro("Done");
		} else {
			const teams = await listTeams(baseUrl);
			process.stdout.write(`${JSON.stringify(teams)}\n`);
		}
	},
});

export const teamsCommand = defineCommand({
	meta: { name: "teams", description: "Manage teams" },
	subCommands: {
		list: listCommand,
	},
});
