import { intro, log, outro } from "@clack/prompts";
import { defineCommand } from "citty";
import { readConfig } from "../utilities";

const showCommand = defineCommand({
	meta: { name: "show", description: "Show current configuration" },
	args: {
		json: {
			type: "boolean",
			description: "JSON output",
			default: false,
		},
	},
	async run({ args }) {
		const config = await readConfig();
		const json = args.json || !process.stdout.isTTY;

		// Mask the token — show only the prefix so it's identifiable but not extractable
		const maskedToken = config.token
			? `${config.token.slice(0, 12)}...`
			: undefined;

		if (!json) {
			intro("Config");
			log.info(`API URL:    ${config.apiUrl}`);
			log.info(`Email:      ${config.userEmail ?? "(not set)"}`);
			log.info(`Token:      ${maskedToken ?? "(not set)"}`);
			log.info(`Team:       ${config.teamId ?? "(not set)"}`);
			log.info(`Project:    ${config.projectId ?? "(not set)"}`);
			outro("Done");
		} else {
			process.stdout.write(
				`${JSON.stringify({ ...config, token: maskedToken ?? null })}\n`,
			);
		}
	},
});

export const configCommand = defineCommand({
	meta: { name: "config", description: "Manage CLI configuration" },
	subCommands: {
		show: showCommand,
	},
});
