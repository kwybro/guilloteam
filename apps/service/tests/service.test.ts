import { describe, expect, test } from "bun:test";
import type {
	Evidence,
	LearningRepository,
	Observation,
} from "@guilloteam/core";
import { createRemoteLearningRepository } from "@guilloteam/learning-client";
import { createServiceApp } from "../src/app";

function createMemoryStore(): LearningRepository {
	const observations: Observation[] = [];
	const evidence: Evidence[] = [];
	return {
		async createObservation(input) {
			const item: Observation = {
				...input,
				id: crypto.randomUUID(),
				metadata: input.metadata ?? {},
				observedAt: input.observedAt ?? new Date().toISOString(),
				createdAt: new Date().toISOString(),
				synthesized: false,
			};
			observations.push(item);
			return item;
		},
		async listObservations(options = {}) {
			return observations
				.filter((item) => !options.unsynthesizedOnly || !item.synthesized)
				.slice(0, options.limit);
		},
		async getObservations(ids) {
			return observations.filter((item) => ids.includes(item.id));
		},
		async createEvidence(input) {
			const item: Evidence = {
				...input,
				id: crypto.randomUUID(),
				intentReferences: input.intentReferences ?? [],
				createdAt: new Date().toISOString(),
			};
			evidence.push(item);
			for (const observation of observations) {
				if (input.observationIds.includes(observation.id)) {
					observation.synthesized = true;
				}
			}
			return item;
		},
		async listEvidence(options = {}) {
			return evidence.slice(0, options.limit);
		},
	};
}

describe("self-hosted Learning service", () => {
	test("shares Learning between ingest clients and agents", async () => {
		const app = createServiceApp(createMemoryStore(), {
			ingestToken: "ingest-secret",
			agentToken: "agent-secret",
		});
		const clientFetch = (input: RequestInfo | URL, init?: RequestInit) =>
			Promise.resolve(app.request(input, init));
		const ingest = createRemoteLearningRepository({
			url: "http://guilloteam.test",
			token: "ingest-secret",
			fetch: clientFetch,
		});
		const agent = createRemoteLearningRepository({
			url: "http://guilloteam.test",
			token: "agent-secret",
			fetch: clientFetch,
		});

		const observation = await ingest.createObservation({
			type: "user_feedback",
			content: "I want multiplayer.",
			source: "arcade",
		});
		expect(await agent.getObservations([observation.id])).toHaveLength(1);
		await agent.createEvidence({
			title: "Multiplayer demand",
			claim: "Players want to play together remotely.",
			confidence: "low",
			observationIds: [observation.id],
		});
		expect(await agent.listEvidence()).toHaveLength(1);
		expect(
			await agent.listObservations({ unsynthesizedOnly: true }),
		).toHaveLength(0);
	});

	test("prevents ingest credentials from reading Learning", async () => {
		const app = createServiceApp(createMemoryStore(), {
			ingestToken: "ingest-secret",
			agentToken: "agent-secret",
		});
		const response = await app.request("/v1/observations", {
			headers: { authorization: "Bearer ingest-secret" },
		});
		expect(response.status).toBe(403);
	});
});
