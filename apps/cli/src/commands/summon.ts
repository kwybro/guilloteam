import { intro, log, outro, spinner } from "@clack/prompts";
import { defineCommand } from "citty";
import { apiFetch, randomLoadingMessage, readConfig } from "../utilities";

type SummonResponse = { token: string; email: string };

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

export const summonCommand = defineCommand({
	meta: { name: "summon", description: "Invite a user to the active team" },
	args: {
		email: { type: "positional", description: "Email address to invite", required: true },
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
			intro("Summon");
			const s = spinner();
			s.start(randomLoadingMessage());
			const invite = await apiFetch<SummonResponse>(`/teams/${teamId}/invites`, {
				method: "POST",
				body: JSON.stringify({ email: args.email }),
			});
			s.stop(`Summoned ${invite.email}`);
			log.info(`Token: ${invite.token}`);
			log.info("Share this token — the invitee runs: guillo team join <token>");
			outro("Done");
		} else {
			const invite = await apiFetch<SummonResponse>(`/teams/${teamId}/invites`, {
				method: "POST",
				body: JSON.stringify({ email: args.email }),
			});
			process.stdout.write(`${JSON.stringify(invite)}\n`);
		}
	},
});
