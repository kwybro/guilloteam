import { intro, log, outro } from "@clack/prompts";
import { defineCommand } from "citty";
import { readConfig, writeConfig } from "../utilities";

const lockTeamCommand = defineCommand({
	meta: { name: "team", description: "Lock to a team (clears active project)" },
	args: {
		id: { type: "positional", description: "Team ID", required: true },
	},
	async run({ args }) {
		await writeConfig({ GUILLOTEAM_TEAM_ID: args.id, GUILLOTEAM_PROJECT_ID: "" });
		if (process.stdout.isTTY) {
			intro("Lock");
			log.success(`Locked to team ${args.id}`);
			outro("Done");
		} else {
			process.stdout.write(`${JSON.stringify({ teamId: args.id })}\n`);
		}
	},
});

const lockProjectCommand = defineCommand({
	meta: { name: "project", description: "Lock to a project" },
	args: {
		id: { type: "positional", description: "Project ID", required: true },
	},
	async run({ args }) {
		const { teamId } = await readConfig();
		if (!teamId) {
			process.stderr.write(
				`${JSON.stringify({ error: "No team locked. Run: guillo lock team <id>" })}\n`,
			);
			process.exit(1);
		}
		await writeConfig({ GUILLOTEAM_PROJECT_ID: args.id });
		if (process.stdout.isTTY) {
			intro("Lock");
			log.success(`Locked to project ${args.id}`);
			outro("Done");
		} else {
			process.stdout.write(`${JSON.stringify({ projectId: args.id })}\n`);
		}
	},
});

export const lockCommand = defineCommand({
	meta: { name: "lock", description: "Set or show working context" },
	subCommands: {
		team: lockTeamCommand,
		project: lockProjectCommand,
	},
	async run() {
		const { teamId, projectId } = await readConfig();
		if (process.stdout.isTTY) {
			intro("Context");
			log.info(`Team:    ${teamId ?? "(not set)"}`);
			log.info(`Project: ${projectId ?? "(not set)"}`);
			outro("Done");
		} else {
			process.stdout.write(
				`${JSON.stringify({ teamId: teamId ?? null, projectId: projectId ?? null })}\n`,
			);
		}
	},
});

export const unlockCommand = defineCommand({
	meta: { name: "unlock", description: "Clear team and project context" },
	async run() {
		await writeConfig({ GUILLOTEAM_TEAM_ID: "", GUILLOTEAM_PROJECT_ID: "" });
		if (process.stdout.isTTY) {
			intro("Unlock");
			log.success("Context cleared");
			outro("Done");
		} else {
			process.stdout.write(`${JSON.stringify({ success: true })}\n`);
		}
	},
});
