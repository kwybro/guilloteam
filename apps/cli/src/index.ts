#!/usr/bin/env bun
import { join, resolve } from "node:path";
import {
	createProductContext,
	findProjectRoot,
	initializeProject,
} from "@guilloteam/core";
import { createDrizzleLearningStore } from "@guilloteam/storage-drizzle";
import { defineCommand, runMain } from "citty";

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
				name: {
					type: "positional",
					description: "Product name",
					required: false,
				},
			},
			async run({ args }) {
				const root = resolve(process.cwd());
				const result = await initializeProject(
					root,
					typeof args.name === "string"
						? args.name
						: (root.split("/").at(-1) ?? "Product"),
				);
				const store = createDrizzleLearningStore(result.databasePath);
				store.close();
				console.log(`Initialized Guilloteam in ${result.contextDirectory}`);
				console.log(
					"Next: edit .guilloteam/intent, then run guilloteam observe <text>",
				);
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
				const store = createDrizzleLearningStore(
					join(root, ".guilloteam", "learning.db"),
				);
				const context = createProductContext(root, store);
				const observation = await context.observe({
					type: String(args.type),
					content: String(args.content),
					source: typeof args.source === "string" ? args.source : undefined,
					actorId: typeof args.actor === "string" ? args.actor : undefined,
				});
				store.close();
				console.log(JSON.stringify(observation, null, 2));
			},
		}),
		context: defineCommand({
			meta: { description: "Print the complete Product Context" },
			async run() {
				const root = await findProjectRoot(process.cwd());
				const store = createDrizzleLearningStore(
					join(root, ".guilloteam", "learning.db"),
				);
				console.log(
					JSON.stringify(
						await createProductContext(root, store).getProductContext(),
						null,
						2,
					),
				);
				store.close();
			},
		}),
	},
});

runMain(main);
