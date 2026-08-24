#!/usr/bin/env bun
import { resolve } from "node:path";
import {
	createProductContext,
	findProjectRoot,
	initializeProject,
	readConfig,
} from "@guilloteam/core";
import { createRemoteLearningRepository } from "@guilloteam/learning-client";
import { defineCommand, runMain } from "citty";

async function connect(root: string) {
	const config = await readConfig(root);
	const token = process.env.GUILLOTEAM_TOKEN;
	if (!token) throw new Error("GUILLOTEAM_TOKEN is required.");
	return createRemoteLearningRepository({
		url: config.learning.url,
		token,
	});
}

const main = defineCommand({
	meta: {
		name: "guilloteam",
		version: "0.1.0",
		description: "Product context for teams and their agents",
	},
	subCommands: {
		init: defineCommand({
			meta: { description: "Initialize Product Context in a repository" },
			args: {
				name: { type: "positional", description: "Product name" },
				url: {
					type: "string",
					default: "http://localhost:3400",
					description: "Guilloteam service URL",
				},
			},
			async run({ args }) {
				const root = resolve(process.cwd());
				const result = await initializeProject(
					root,
					typeof args.name === "string"
						? args.name
						: (root.split("/").at(-1) ?? "Product"),
					String(args.url),
				);
				console.log(`Initialized Guilloteam in ${result.contextDirectory}`);
				console.log("Set GUILLOTEAM_TOKEN, then edit .guilloteam/intent.");
			},
		}),
		observe: defineCommand({
			meta: { description: "Record a product observation" },
			args: {
				content: { type: "positional", required: true },
				type: { type: "string", default: "user_feedback" },
				source: { type: "string" },
				actor: { type: "string" },
			},
			async run({ args }) {
				const root = await findProjectRoot(process.cwd());
				const context = createProductContext(root, await connect(root));
				console.log(
					JSON.stringify(
						await context.observe({
							type: String(args.type),
							content: String(args.content),
							source: typeof args.source === "string" ? args.source : undefined,
							actorId: typeof args.actor === "string" ? args.actor : undefined,
						}),
						null,
						2,
					),
				);
			},
		}),
		context: defineCommand({
			meta: { description: "Print the complete Product Context" },
			async run() {
				const root = await findProjectRoot(process.cwd());
				console.log(
					JSON.stringify(
						await createProductContext(
							root,
							await connect(root),
						).getProductContext(),
						null,
						2,
					),
				);
			},
		}),
	},
});

runMain(main);
