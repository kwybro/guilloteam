import { intro, log, outro, spinner } from "@clack/prompts";
import type { TeamSelect } from "@guilloteam/data-ops";
import { defineCommand } from "citty";
import { apiFetch, randomLoadingMessage } from "../utilities";

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

export const teamsCommand = defineCommand({
	meta: { name: "teams", description: "Manage teams" },
	subCommands: {
		list: listCommand,
	},
});
