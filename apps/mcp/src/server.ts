import { join } from "node:path";
import { createProductContext, findProjectRoot } from "@guilloteam/core";
import { createDrizzleLearningStore } from "@guilloteam/storage-drizzle";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const result = (value: unknown) => ({
	content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

export async function buildServer(start = process.cwd()) {
	const root = await findProjectRoot(start);
	const store = createDrizzleLearningStore(
		join(root, ".guilloteam", "learning.db"),
	);
	const context = createProductContext(root, store);
	const server = new McpServer({ name: "guilloteam", version: "0.1.0" });

	server.registerTool(
		"get_product_context",
		{ description: "Read the product's Intent and current Learning." },
		async () => result(await context.getProductContext()),
	);
	server.registerTool(
		"get_intent",
		{ description: "Read the product Constitution and World Model." },
		async () => result(await context.getIntent()),
	);
	server.registerTool(
		"get_pending_context_work",
		{ description: "Find Product Context that is ready for synthesis." },
		async () => result(await context.getPendingContextWork()),
	);
	server.registerTool(
		"list_observations",
		{
			description:
				"List raw product observations. Use unsynthesizedOnly when preparing Evidence.",
			inputSchema: {
				unsynthesizedOnly: z.boolean().optional(),
				limit: z.number().int().positive().max(500).optional(),
			},
		},
		async (input) => result(await context.listObservations(input)),
	);
	server.registerTool(
		"create_observation",
		{
			description:
				"Record a raw fact, signal, note, or piece of feedback about the product.",
			inputSchema: {
				type: z.string().min(1),
				content: z.string().min(1),
				source: z.string().min(1).optional(),
				actorId: z.string().min(1).optional(),
				metadata: z.record(z.string(), z.unknown()).optional(),
				observedAt: z.string().datetime().optional(),
			},
		},
		async (input) => result(await context.observe(input)),
	);
	server.registerTool(
		"list_evidence",
		{
			description: "List durable Evidence and its cited observations.",
			inputSchema: { limit: z.number().int().positive().max(500).optional() },
		},
		async (input) => result(await context.listEvidence(input)),
	);
	server.registerTool(
		"create_evidence",
		{
			description:
				"Persist an inspectable synthesis. Every Evidence claim must cite observations.",
			inputSchema: {
				title: z.string().min(1),
				claim: z.string().min(1),
				confidence: z.enum(["low", "medium", "high"]),
				rationale: z.string().min(1).optional(),
				observationIds: z.array(z.string().min(1)).min(1),
				intentReferences: z.array(z.string().min(1)).optional(),
				createdBy: z.string().min(1).optional(),
			},
		},
		async (input) => result(await context.createEvidence(input)),
	);

	return { server, close: () => store.close() };
}
