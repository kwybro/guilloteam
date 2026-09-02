import { timingSafeEqual } from "node:crypto";
import type {
	LearningRepository,
	ProjectInitiativeRepository,
	ProjectNoiseRepository,
	ProjectNoOpSynthesisRepository,
	QueueRepository,
	TeamProjectRepository,
} from "@guilloteam/core";
import {
	createExecutionQueue,
	createTeamWorkspace,
	evidenceInputSchema,
	observationInputSchema,
	parseCompleteQueueItemInput,
	parseInputInput,
	parseInputUpdate,
	parseMoveQueueItemInput,
	parseQueueInput,
	parseQueueItemInput,
	parseQueueItemReadiness,
	parseQueueItemUpdate,
} from "@guilloteam/core";
import { Hono } from "hono";

export interface ServiceAuth {
	ingestToken: string;
	agentToken: string;
	userToken?: string;
}

function tokenMatches(actual: string, expected: string) {
	if (!actual || !expected) return false;
	const left = Buffer.from(actual);
	const right = Buffer.from(expected);
	return left.length === right.length && timingSafeEqual(left, right);
}

export function createServiceApp(
	learning: LearningRepository,
	queue: QueueRepository,
	teamProject: TeamProjectRepository &
		ProjectNoiseRepository &
		ProjectInitiativeRepository &
		ProjectNoOpSynthesisRepository,
	auth: ServiceAuth,
) {
	if (
		!auth.ingestToken ||
		!auth.agentToken ||
		auth.ingestToken === auth.agentToken ||
		(auth.userToken &&
			(auth.userToken === auth.ingestToken ||
				auth.userToken === auth.agentToken))
	) {
		throw new Error(
			"Configured ingest, agent, and user tokens must be distinct.",
		);
	}
	const app: Hono = new Hono();
	const execution = createExecutionQueue(queue);
	const collaboration = createTeamWorkspace(teamProject);
	app.onError((error, c) =>
		c.json(
			{
				error:
					error instanceof Error ? error.message : "Unexpected service error",
			},
			400,
		),
	);
	const role = (authorization?: string) => {
		const token = authorization?.startsWith("Bearer ")
			? authorization.slice(7)
			: "";
		if (tokenMatches(token, auth.userToken ?? "")) return "user";
		if (tokenMatches(token, auth.agentToken)) return "agent";
		if (tokenMatches(token, auth.ingestToken)) return "ingest";
		return undefined;
	};

	app.get("/health", (c) => c.json({ status: "ok" }));
	app.post("/v1/teams", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(await collaboration.createTeam(await c.req.json()), 201);
	});
	app.post("/v1/teams/:teamId/members", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(
			await collaboration.joinTeam(c.req.param("teamId"), await c.req.json()),
			201,
		);
	});
	app.post("/v1/teams/:teamId/projects", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(
			await collaboration.createProject(
				c.req.param("teamId"),
				await c.req.json(),
			),
			201,
		);
	});
	app.get("/v1/projects/:projectId/workspace", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(
			await collaboration.getProjectWorkspace(c.req.param("projectId")),
		);
	});
	app.post("/v1/projects/:projectId/noise", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(
			await collaboration.captureNoise(
				c.req.param("projectId"),
				await c.req.json(),
			),
			201,
		);
	});
	app.get("/v1/projects/:projectId/noise", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		const limit = Number(c.req.query("limit") ?? 100);
		if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
			return c.json({ error: "limit must be between 1 and 500" }, 400);
		}
		return c.json(
			await collaboration.listNoise(c.req.param("projectId"), { limit }),
		);
	});
	app.post("/v1/projects/:projectId/initiatives/synthesize", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(
			await collaboration.synthesizeNoise(
				c.req.param("projectId"),
				await c.req.json(),
			),
			201,
		);
	});
	app.get("/v1/projects/:projectId/initiatives/:initiativeId", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(
			await collaboration.getInitiative(
				c.req.param("projectId"),
				c.req.param("initiativeId"),
			),
		);
	});
	app.patch("/v1/projects/:projectId/initiatives/:initiativeId", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(
			await collaboration.updateInitiative(
				c.req.param("projectId"),
				c.req.param("initiativeId"),
				await c.req.json(),
			),
		);
	});
	app.post(
		"/v1/projects/:projectId/initiatives/:initiativeId/merge",
		async (c) => {
			if (role(c.req.header("authorization")) !== "agent") {
				return c.json({ error: "Agent access required" }, 403);
			}
			return c.json(
				await collaboration.mergeInitiatives(
					c.req.param("projectId"),
					c.req.param("initiativeId"),
					await c.req.json(),
				),
			);
		},
	);
	app.post(
		"/v1/projects/:projectId/initiatives/:initiativeId/graduate",
		async (c) => {
			if (role(c.req.header("authorization")) !== "user") {
				return c.json({ error: "User access required" }, 403);
			}
			return c.json(
				await collaboration.graduateInitiative(
					c.req.param("projectId"),
					c.req.param("initiativeId"),
					await c.req.json(),
				),
			);
		},
	);
	app.post(
		"/v1/projects/:projectId/initiatives/:initiativeId/complete",
		async (c) => {
			if (role(c.req.header("authorization")) !== "user") {
				return c.json({ error: "User access required" }, 403);
			}
			return c.json(
				await collaboration.completeInitiative(
					c.req.param("projectId"),
					c.req.param("initiativeId"),
					await c.req.json(),
				),
			);
		},
	);
	app.post(
		"/v1/projects/:projectId/initiatives/:initiativeId/noise",
		async (c) => {
			if (role(c.req.header("authorization")) !== "agent") {
				return c.json({ error: "Agent access required" }, 403);
			}
			return c.json(
				await collaboration.attachNoiseToInitiative(
					c.req.param("projectId"),
					c.req.param("initiativeId"),
					await c.req.json(),
				),
			);
		},
	);
	app.post("/v1/projects/:projectId/syntheses/deferred", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(
			await collaboration.recordNoOpSynthesis(
				c.req.param("projectId"),
				await c.req.json(),
			),
			201,
		);
	});
	app.get("/v1/projects/:projectId/syntheses/deferred", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		const limit = Number(c.req.query("limit") ?? 100);
		if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
			return c.json({ error: "limit must be between 1 and 500" }, 400);
		}
		return c.json(
			await collaboration.listNoOpSyntheses(c.req.param("projectId"), {
				limit,
			}),
		);
	});
	app.get("/v1/projects/:projectId/workshop", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		const limit = Number(c.req.query("limit") ?? 100);
		if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
			return c.json({ error: "limit must be between 1 and 500" }, 400);
		}
		return c.json(
			await collaboration.listWorkshopInitiatives(c.req.param("projectId"), {
				limit,
			}),
		);
	});
	app.get("/v1/projects/:projectId/queue", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		const limit = Number(c.req.query("limit") ?? 100);
		if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
			return c.json({ error: "limit must be between 1 and 500" }, 400);
		}
		return c.json(
			await collaboration.listInitiativeQueue(c.req.param("projectId"), {
				limit,
			}),
		);
	});
	app.post("/v1/projects/:projectId/queue/start-next", async (c) => {
		if (role(c.req.header("authorization")) !== "user") {
			return c.json({ error: "User access required" }, 403);
		}
		return c.json(
			await collaboration.startNextInitiative(
				c.req.param("projectId"),
				await c.req.json(),
			),
		);
	});
	app.post("/v1/observations", async (c) => {
		if (!role(c.req.header("authorization"))) {
			return c.json({ error: "Unauthorized" }, 401);
		}
		const parsed = observationInputSchema.safeParse(await c.req.json());
		if (!parsed.success) {
			return c.json({ error: parsed.error.flatten() }, 400);
		}
		return c.json(await learning.createObservation(parsed.data), 201);
	});
	app.get("/v1/observations", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		const ids = c.req.query("ids")?.split(",").filter(Boolean);
		if (ids?.length) return c.json(await learning.getObservations(ids));
		const limit = Number(c.req.query("limit") ?? 100);
		if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
			return c.json({ error: "limit must be between 1 and 500" }, 400);
		}
		return c.json(
			await learning.listObservations({
				unsynthesizedOnly: c.req.query("unsynthesizedOnly") === "true",
				limit,
			}),
		);
	});
	app.get("/v1/evidence", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		const limit = Number(c.req.query("limit") ?? 100);
		if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
			return c.json({ error: "limit must be between 1 and 500" }, 400);
		}
		return c.json(await learning.listEvidence({ limit }));
	});
	app.post("/v1/evidence", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		const parsed = evidenceInputSchema.safeParse(await c.req.json());
		if (!parsed.success) {
			return c.json({ error: parsed.error.flatten() }, 400);
		}
		return c.json(await learning.createEvidence(parsed.data), 201);
	});
	app.get("/v1/inputs", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		const limit = Number(c.req.query("limit") ?? 100);
		if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
			return c.json({ error: "limit must be between 1 and 500" }, 400);
		}
		return c.json(
			await execution.listInputs({
				unlinkedOnly: c.req.query("unlinkedOnly") === "true",
				limit,
			}),
		);
	});
	app.post("/v1/inputs", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(
			await execution.createInput(parseInputInput(await c.req.json())),
			201,
		);
	});
	app.get("/v1/inputs/:id", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(await execution.getInput(c.req.param("id")));
	});
	app.patch("/v1/inputs/:id", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(
			await execution.updateInput(
				c.req.param("id"),
				parseInputUpdate(await c.req.json()),
			),
		);
	});
	app.get("/v1/queues", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		const limit = Number(c.req.query("limit") ?? 100);
		if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
			return c.json({ error: "limit must be between 1 and 500" }, 400);
		}
		return c.json(await execution.listQueues({ limit }));
	});
	app.post("/v1/queues", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(
			await execution.createQueue(parseQueueInput(await c.req.json())),
			201,
		);
	});
	app.get("/v1/queues/:queueId/next-to-prepare", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(
			(await execution.getNextToPrepare(c.req.param("queueId"))) ?? null,
		);
	});
	app.get("/v1/queues/:queueId/next-to-execute", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(
			(await execution.getNextToExecute(c.req.param("queueId"))) ?? null,
		);
	});
	app.get("/v1/queues/:id", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(await execution.getQueue(c.req.param("id")));
	});
	app.patch("/v1/queues/:id", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(
			await execution.updateQueue(
				c.req.param("id"),
				parseQueueInput(await c.req.json()),
			),
		);
	});
	app.get("/v1/queue-items", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		const queueId = c.req.query("queueId");
		if (!queueId) return c.json({ error: "queueId is required" }, 400);
		const limit = Number(c.req.query("limit") ?? 100);
		if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
			return c.json({ error: "limit must be between 1 and 500" }, 400);
		}
		return c.json(
			await execution.listQueueItems({
				queueId,
				includeDone: c.req.query("includeDone") === "true",
				limit,
			}),
		);
	});
	app.post("/v1/queue-items", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(
			await execution.createQueueItem(parseQueueItemInput(await c.req.json())),
			201,
		);
	});
	app.get("/v1/queue-items/:id", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(await execution.getQueueItem(c.req.param("id")));
	});
	app.patch("/v1/queue-items/:id", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(
			await execution.updateQueueItem(
				c.req.param("id"),
				parseQueueItemUpdate(await c.req.json()),
			),
		);
	});
	app.post("/v1/queue-items/:id/move", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(
			await execution.moveQueueItem(
				c.req.param("id"),
				parseMoveQueueItemInput(await c.req.json()),
			),
		);
	});
	app.post("/v1/queue-items/:id/readiness", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(
			await execution.setQueueItemReadiness(
				c.req.param("id"),
				parseQueueItemReadiness((await c.req.json()).readiness),
			),
		);
	});
	app.post("/v1/queue-items/:id/start", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(await execution.startQueueItem(c.req.param("id")));
	});
	app.post("/v1/queue-items/:id/complete", async (c) => {
		if (role(c.req.header("authorization")) !== "agent") {
			return c.json({ error: "Agent access required" }, 403);
		}
		return c.json(
			await execution.completeQueueItem(
				c.req.param("id"),
				parseCompleteQueueItemInput(await c.req.json()),
			),
		);
	});
	return app;
}
