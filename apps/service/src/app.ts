import { timingSafeEqual } from "node:crypto";
import type { LearningRepository } from "@guilloteam/core";
import { evidenceInputSchema, observationInputSchema } from "@guilloteam/core";
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
	auth: ServiceAuth,
) {
	if (
		!auth.ingestToken ||
		!auth.agentToken ||
		auth.ingestToken === auth.agentToken
	) {
		throw new Error("Distinct ingest and agent tokens are required.");
	}
	const app = new Hono();
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
	return app;
}
