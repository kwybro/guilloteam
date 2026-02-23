import { confirm, intro, isCancel, log, outro, spinner } from "@clack/prompts";
import type { InviteSelect, TeamSelect } from "@guilloteam/data-ops";
import { defineCommand } from "citty";
import { apiFetch, randomLoadingMessage, readConfig, writeConfig } from "../utilities";

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

const joinCommand = defineCommand({
	meta: { name: "join", description: "Accept a team invite" },
	args: {
		token: { type: "positional", description: "Invite token", required: true },
		pretty: {
			type: "boolean",
			description: "Human-readable output",
			default: false,
		},
	},
	async run({ args }) {
		const pretty = args.pretty || process.stdout.isTTY;

		if (pretty) {
			intro("Join team");
			const s = spinner();
			s.start(randomLoadingMessage());
			const team = await apiFetch<TeamSelect>(`/invites/${args.token}/accept`, {
				method: "POST",
			});
			s.stop(`Joined "${team.name}"`);
			const config = await readConfig();
			if (!config.teamId) {
				await writeConfig({ GUILLOTEAM_TEAM_ID: team.id });
				log.info(`Auto-locked to team ${team.id}`);
			}
			outro("Done");
		} else {
			const team = await apiFetch<TeamSelect>(`/invites/${args.token}/accept`, {
				method: "POST",
			});
			const config = await readConfig();
			let autoLocked = false;
			if (!config.teamId) {
				await writeConfig({ GUILLOTEAM_TEAM_ID: team.id });
				autoLocked = true;
			}
			process.stdout.write(`${JSON.stringify({ ...team, autoLocked })}\n`);
		}
	},
});

const revokeCommand = defineCommand({
	meta: { name: "revoke", description: "Revoke a pending invite" },
	args: {
		id: { type: "positional", description: "Invite ID", required: true },
		team: { type: "string", description: "Team ID (overrides locked team)" },
	},
	async run({ args }) {
		const teamId = await resolveTeam(args.team);

		if (process.stdout.isTTY) {
			const confirmed = await confirm({ message: `Revoke invite ${args.id}?` });
			if (isCancel(confirmed) || !confirmed) {
				outro("Cancelled");
				process.exit(0);
			}
			const s = spinner();
			s.start(randomLoadingMessage());
			await apiFetch<InviteSelect>(`/teams/${teamId}/invites/${args.id}`, {
				method: "DELETE",
			});
			s.stop("Revoked");
			outro("Done");
		} else {
			const invite = await apiFetch<InviteSelect>(
				`/teams/${teamId}/invites/${args.id}`,
				{ method: "DELETE" },
			);
			process.stdout.write(`${JSON.stringify(invite)}\n`);
		}
	},
});

const invitesCommand = defineCommand({
	meta: { name: "invites", description: "List pending invites (run with 'revoke <id>' to revoke)" },
	args: {
		team: { type: "string", description: "Team ID (overrides locked team)" },
		pretty: {
			type: "boolean",
			description: "Human-readable output",
			default: false,
		},
	},
	subCommands: {
		revoke: revokeCommand,
	},
	async run({ args }) {
		const teamId = await resolveTeam(args.team);
		const pretty = args.pretty || process.stdout.isTTY;

		if (pretty) {
			intro("Invites");
			const s = spinner();
			s.start(randomLoadingMessage());
			const inviteList = await apiFetch<InviteSelect[]>(`/teams/${teamId}/invites`);
			s.stop(`Found ${inviteList.length} pending invite(s)`);
			for (const invite of inviteList) {
				log.info(`${invite.email}  ID: ${invite.id}  Expires: ${invite.expiresAt}`);
			}
			outro("Done");
		} else {
			const inviteList = await apiFetch<InviteSelect[]>(`/teams/${teamId}/invites`);
			process.stdout.write(`${JSON.stringify(inviteList)}\n`);
		}
	},
});

export const teamCommand = defineCommand({
	meta: { name: "team", description: "Team membership commands" },
	subCommands: {
		join: joinCommand,
		invites: invitesCommand,
	},
});
