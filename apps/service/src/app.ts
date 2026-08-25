import { timingSafeEqual } from "node:crypto";
import type { LearningRepository, QueueRepository } from "@guilloteam/core";
import {
	createExecutionQueue,
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
	auth: ServiceAuth,
) {
	if (
		!auth.ingestToken ||
		!auth.agentToken ||
		auth.ingestToken === auth.agentToken
	) {
		throw new Error("Distinct ingest and agent tokens are required.");
	}
	const app: Hono = new Hono();
	const execution = createExecutionQueue(queue);
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
		if (tokenMatches(token, auth.agentToken)) return "agent";
		if (tokenMatches(token, auth.ingestToken)) return "ingest";
		return undefined;
	};

	app.get("/health", (c) => c.json({ status: "ok" }));
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
