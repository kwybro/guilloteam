import {
	createExecutionQueue,
	createProductContext,
	findProjectRoot,
	readConfig,
} from "@guilloteam/core";
import {
	createRemoteLearningRepository,
	createRemoteQueueRepository,
} from "@guilloteam/learning-client";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const result = (value: unknown) => ({
	content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

export async function buildServer(start = process.cwd()) {
	const root = await findProjectRoot(start);
	const config = await readConfig(root);
	const token = process.env.GUILLOTEAM_TOKEN;
	if (!token) throw new Error("GUILLOTEAM_TOKEN is required.");
	const remoteOptions = { url: config.learning.url, token };
	const context = createProductContext(
		root,
		createRemoteLearningRepository(remoteOptions),
	);
	const execution = createExecutionQueue(
		createRemoteQueueRepository(remoteOptions),
	);
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
	server.registerTool(
		"list_inputs",
		{
			description:
				"List development-team Inputs. Use unlinkedOnly to review material not yet connected to a Queue Item.",
			inputSchema: {
				unlinkedOnly: z.boolean().optional(),
				limit: z.number().int().positive().max(500).optional(),
			},
		},
		async (input) => result(await execution.listInputs(input)),
	);
	server.registerTool(
		"create_input",
		{
			description:
				"Record an idea, bug, finding, concern, or other unstructured development-team Input.",
			inputSchema: {
				name: z.string().min(1),
				description: z.string().min(1),
			},
		},
		async (input) => result(await execution.createInput(input)),
	);
	server.registerTool(
		"get_input",
		{
			description: "Read one Input by ID.",
			inputSchema: { id: z.string().min(1) },
		},
		async (input) => result(await execution.getInput(input.id)),
	);
	server.registerTool(
		"update_input",
		{
			description: "Refine an existing Input without changing its history.",
			inputSchema: {
				id: z.string().min(1),
				name: z.string().min(1).optional(),
				description: z.string().min(1).optional(),
			},
		},
		async ({ id, ...input }) => result(await execution.updateInput(id, input)),
	);
	server.registerTool(
		"list_queues",
		{
			description: "List the team's independent execution queues.",
			inputSchema: { limit: z.number().int().positive().max(500).optional() },
		},
		async (input) => result(await execution.listQueues(input)),
	);
	server.registerTool(
		"create_queue",
		{
			description:
				"Create an independent execution queue. Start with one queue unless work truly needs a separate coordination boundary.",
			inputSchema: { name: z.string().min(1) },
		},
		async (input) => result(await execution.createQueue(input)),
	);
	server.registerTool(
		"get_queue",
		{
			description: "Read one execution queue by ID.",
			inputSchema: { id: z.string().min(1) },
		},
		async (input) => result(await execution.getQueue(input.id)),
	);
	server.registerTool(
		"update_queue",
		{
			description: "Rename an execution queue.",
			inputSchema: { id: z.string().min(1), name: z.string().min(1) },
		},
		async ({ id, name }) => result(await execution.updateQueue(id, { name })),
	);
	server.registerTool(
		"list_queue_items",
		{
			description:
				"List Queue Items in deterministic queue order. Completed items are hidden unless includeDone is true.",
			inputSchema: {
				queueId: z.string().min(1),
				includeDone: z.boolean().optional(),
				limit: z.number().int().positive().max(500).optional(),
			},
		},
		async (input) => result(await execution.listQueueItems(input)),
	);
	server.registerTool(
		"create_queue_item",
		{
			description:
				"Choose work for a Queue and begin its living context canvas. New items are queued and not ready.",
			inputSchema: {
				queueId: z.string().min(1),
				name: z.string().min(1),
				description: z.string().min(1),
				inputIds: z.array(z.string().min(1)).optional(),
				position: z.number().int().positive().optional(),
			},
		},
		async (input) => result(await execution.createQueueItem(input)),
	);
	server.registerTool(
		"get_queue_item",
		{
			description: "Read a Queue Item and the Input IDs linked to its context.",
			inputSchema: { id: z.string().min(1) },
		},
		async (input) => result(await execution.getQueueItem(input.id)),
	);
	server.registerTool(
		"update_queue_item",
		{
			description:
				"Develop a queued item's context. Only queued items can be changed in v0.",
			inputSchema: {
				id: z.string().min(1),
				name: z.string().min(1).optional(),
				description: z.string().min(1).optional(),
				inputIds: z.array(z.string().min(1)).optional(),
			},
		},
		async ({ id, ...input }) =>
			result(await execution.updateQueueItem(id, input)),
	);
	server.registerTool(
		"move_queue_item",
		{
			description:
				"Change a Queue Item's priority position within its Queue. Completed items cannot move.",
			inputSchema: {
				id: z.string().min(1),
				position: z.number().int().positive(),
			},
		},
		async ({ id, position }) =>
			result(await execution.moveQueueItem(id, { position })),
	);
	server.registerTool(
		"set_queue_item_readiness",
		{
			description:
				"Explicitly mark a queued item ready or not ready. A human should make this commitment.",
			inputSchema: {
				id: z.string().min(1),
				readiness: z.enum(["not_ready", "ready"]),
			},
		},
		async ({ id, readiness }) =>
			result(await execution.setQueueItemReadiness(id, readiness)),
	);
	server.registerTool(
		"get_next_to_prepare",
		{
			description:
				"Return the highest-priority queued item that still needs context before execution.",
			inputSchema: { queueId: z.string().min(1) },
		},
		async (input) => result(await execution.getNextToPrepare(input.queueId)),
	);
	server.registerTool(
		"get_next_to_execute",
		{
			description:
				"Return the highest-priority ready item that has not yet started executing.",
			inputSchema: { queueId: z.string().min(1) },
		},
		async (input) => result(await execution.getNextToExecute(input.queueId)),
	);
	server.registerTool(
		"start_queue_item",
		{
			description:
				"Atomically start a ready Queue Item before beginning execution. It fails if another agent has already claimed it.",
			inputSchema: { id: z.string().min(1) },
		},
		async (input) => result(await execution.startQueueItem(input.id)),
	);
	server.registerTool(
		"complete_queue_item",
		{
			description:
				"Complete an in-progress Queue Item and optionally record what execution produced.",
			inputSchema: {
				id: z.string().min(1),
				completionSummary: z.string().min(1).optional(),
			},
		},
		async ({ id, completionSummary }) =>
			result(await execution.completeQueueItem(id, { completionSummary })),
	);

	return { server };
}
