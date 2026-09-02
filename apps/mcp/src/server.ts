import { createRemoteProjectWorkspaceClient } from "@guilloteam/learning-client";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const result = (value: unknown) => ({
	content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

export interface McpServerOptions {
	url?: string;
	token?: string;
	fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

/**
 * Build the Project-first MCP adapter. It deliberately has no repository or
 * local-config dependency: the HTTP service is selected by GUILLOTEAM_URL.
 */
export function buildServer(options: McpServerOptions = {}) {
	const url = options.url ?? process.env.GUILLOTEAM_URL;
	const token = options.token ?? process.env.GUILLOTEAM_TOKEN;
	if (!url) throw new Error("GUILLOTEAM_URL is required.");
	if (!token) throw new Error("GUILLOTEAM_TOKEN is required.");
	const projects = createRemoteProjectWorkspaceClient({
		url,
		token,
		fetch: options.fetch,
	});
	const server = new McpServer({ name: "guilloteam", version: "0.1.0" });

	server.registerTool(
		"create_team",
		{
			description:
				"Create a Team, the shared home for related Projects. The owner must be the user ID represented by this agent session.",
			inputSchema: {
				name: z.string().min(1),
				ownerId: z.string().min(1),
			},
		},
		async (input) => result(await projects.createTeam(input)),
	);
	server.registerTool(
		"join_team",
		{
			description:
				"Add a user to an existing Team before that user captures Noise or works in its Projects.",
			inputSchema: {
				teamId: z.string().min(1),
				userId: z.string().min(1),
			},
		},
		async ({ teamId, userId }) =>
			result(await projects.joinTeam(teamId, { userId })),
	);
	server.registerTool(
		"create_project",
		{
			description:
				"Create a Project inside a Team. A Project owns its own shared Noise, Workshop, execution queue, and outcomes.",
			inputSchema: {
				teamId: z.string().min(1),
				name: z.string().min(1),
				userId: z.string().min(1),
			},
		},
		async ({ teamId, ...input }) =>
			result(await projects.createProject(teamId, input)),
	);
	server.registerTool(
		"get_project_workspace",
		{
			description:
				"Read a Project's counts for Noise, Workshop signals, queue, and outcomes. Use this to orient before deciding the next synthesis step.",
			inputSchema: { projectId: z.string().min(1) },
		},
		async ({ projectId }) =>
			result(await projects.getProjectWorkspace(projectId)),
	);
	server.registerTool(
		"capture_noise",
		{
			description:
				"Capture raw Project-scoped material such as a fleeting thought, conversation, article, research finding, or request. Do not turn it into an Initiative yet; preserve the source and optional metadata.",
			inputSchema: {
				projectId: z.string().min(1),
				content: z.string().min(1),
				source: z.string().min(1),
				userId: z.string().min(1),
				metadata: z.record(z.string(), z.unknown()).optional(),
			},
		},
		async ({ projectId, ...input }) =>
			result(await projects.captureNoise(projectId, input)),
	);
	server.registerTool(
		"list_project_noise",
		{
			description:
				"List raw Noise for one Project. Review this before synthesis; Noise from a different Project cannot support its Initiative.",
			inputSchema: {
				projectId: z.string().min(1),
				limit: z.number().int().positive().max(500).optional(),
			},
		},
		async ({ projectId, limit }) =>
			result(await projects.listNoise(projectId, { limit })),
	);
	server.registerTool(
		"synthesize_noise",
		{
			description:
				"Create one concise signal-state Initiative in the Project Workshop from one or more relevant Noise items. Select only the Noise that supports the statement so its provenance stays useful. Do not use this to create duplicate work: attach Noise to an existing signal, merge related signals, or defer synthesis when appropriate.",
			inputSchema: {
				projectId: z.string().min(1),
				statement: z.string().min(1),
				noiseIds: z.array(z.string().min(1)).min(1),
				userId: z.string().min(1),
			},
		},
		async ({ projectId, ...input }) =>
			result(await projects.synthesizeNoise(projectId, input)),
	);
	server.registerTool(
		"get_initiative",
		{
			description:
				"Read one Initiative, including its lifecycle state and the IDs of the Noise that supports it.",
			inputSchema: {
				projectId: z.string().min(1),
				initiativeId: z.string().min(1),
			},
		},
		async ({ projectId, initiativeId }) =>
			result(await projects.getInitiative(projectId, initiativeId)),
	);
	server.registerTool(
		"update_initiative",
		{
			description:
				"Refine the concise statement of a signal-state Workshop Initiative. This changes neither its supporting Noise nor its lifecycle state.",
			inputSchema: {
				projectId: z.string().min(1),
				initiativeId: z.string().min(1),
				statement: z.string().min(1),
				userId: z.string().min(1),
			},
		},
		async ({ projectId, initiativeId, ...input }) =>
			result(await projects.updateInitiative(projectId, initiativeId, input)),
	);
	server.registerTool(
		"attach_noise_to_initiative",
		{
			description:
				"Add one or more newly relevant Noise items to an existing signal-state Initiative. Use this instead of creating a second Initiative when the work is already represented; duplicate Noise attachments are rejected.",
			inputSchema: {
				projectId: z.string().min(1),
				initiativeId: z.string().min(1),
				noiseIds: z.array(z.string().min(1)).min(1),
				userId: z.string().min(1),
			},
		},
		async ({ projectId, initiativeId, ...input }) =>
			result(
				await projects.attachNoiseToInitiative(projectId, initiativeId, input),
			),
	);
	server.registerTool(
		"merge_initiatives",
		{
			description:
				"Merge one or more related signal-state Workshop Initiatives into a surviving signal. The survivor retains all distinct Noise provenance; absorbed Initiatives remain auditable records and leave the Workshop.",
			inputSchema: {
				projectId: z.string().min(1),
				initiativeId: z.string().min(1),
				absorbedInitiativeIds: z.array(z.string().min(1)).min(1),
				userId: z.string().min(1),
			},
		},
		async ({ projectId, initiativeId, ...input }) =>
			result(await projects.mergeInitiatives(projectId, initiativeId, input)),
	);
	server.registerTool(
		"defer_noise_synthesis",
		{
			description:
				"Record the agent's decision to defer selected Project Noise because it does not warrant an Initiative yet. This is an agent synthesis outcome, not a user request. Keep the rationale concise; the Noise remains available for future synthesis.",
			inputSchema: {
				projectId: z.string().min(1),
				noiseIds: z.array(z.string().min(1)).min(1),
				rationale: z.string().min(1),
				userId: z.string().min(1),
			},
		},
		async ({ projectId, ...input }) =>
			result(await projects.deferNoiseSynthesis(projectId, input)),
	);
	server.registerTool(
		"list_deferred_syntheses",
		{
			description:
				"List prior deferred synthesis decisions for a Project so the agent can revisit their rationale before creating new work.",
			inputSchema: {
				projectId: z.string().min(1),
				limit: z.number().int().positive().max(500).optional(),
			},
		},
		async ({ projectId, limit }) =>
			result(await projects.listDeferredSyntheses(projectId, { limit })),
	);
	server.registerTool(
		"list_workshop_initiatives",
		{
			description:
				"List signal-state Initiatives in the Project Workshop. They are incomplete work signals: prepare or consolidate them, then recommend graduation to a user when ready.",
			inputSchema: {
				projectId: z.string().min(1),
				limit: z.number().int().positive().max(500).optional(),
			},
		},
		async ({ projectId, limit }) =>
			result(await projects.listWorkshopInitiatives(projectId, { limit })),
	);
	server.registerTool(
		"list_project_queue",
		{
			description:
				"List the Project's shared execution queue in position order. This is read-only for an agent: a user must graduate an Initiative, start the next Initiative, and complete it through the user-authorized application surface.",
			inputSchema: {
				projectId: z.string().min(1),
				limit: z.number().int().positive().max(500).optional(),
			},
		},
		async ({ projectId, limit }) =>
			result(await projects.listInitiativeQueue(projectId, { limit })),
	);

	return { server };
}
