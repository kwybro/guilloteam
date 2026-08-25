import { describe, expect, test } from "bun:test";
import type {
	Evidence,
	Input,
	LearningRepository,
	Observation,
	Queue,
	QueueItem,
	QueueRepository,
} from "@guilloteam/core";
import {
	createRemoteLearningRepository,
	createRemoteQueueRepository,
} from "@guilloteam/learning-client";
import { createServiceApp } from "../src/app";

function createMemoryStore(): LearningRepository & QueueRepository {
	const observations: Observation[] = [];
	const evidence: Evidence[] = [];
	const inputs: Input[] = [];
	const queues: Queue[] = [];
	const queueItems: QueueItem[] = [];
	const timestamp = () => new Date().toISOString();
	const clone = <T>(value: T): T => structuredClone(value);
	const activeItems = (queueId: string) =>
		queueItems
			.filter((item) => item.queueId === queueId && item.status !== "done")
			.sort((left, right) => left.position - right.position);
	const updateTimestamp = <T extends { updatedAt: string }>(item: T) => {
		item.updatedAt = timestamp();
		return item;
	};
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
		async createInput(input) {
			const item: Input = {
				...input,
				id: crypto.randomUUID(),
				createdAt: timestamp(),
				updatedAt: timestamp(),
			};
			inputs.push(item);
			return clone(item);
		},
		async listInputs(options = {}) {
			return inputs
				.filter(
					(input) =>
						!options.unlinkedOnly ||
						!queueItems.some((item) => item.inputIds.includes(input.id)),
				)
				.slice(0, options.limit)
				.map(clone);
		},
		async getInputs(ids) {
			return inputs.filter((input) => ids.includes(input.id)).map(clone);
		},
		async updateInput(id, input) {
			const item = inputs.find((candidate) => candidate.id === id);
			if (!item) return undefined;
			Object.assign(item, input);
			return clone(updateTimestamp(item));
		},
		async createQueue(input) {
			const queue: Queue = {
				id: crypto.randomUUID(),
				...input,
				createdAt: timestamp(),
				updatedAt: timestamp(),
			};
			queues.push(queue);
			return clone(queue);
		},
		async listQueues(options = {}) {
			return queues.slice(0, options.limit).map(clone);
		},
		async getQueue(id) {
			const queue = queues.find((candidate) => candidate.id === id);
			return queue ? clone(queue) : undefined;
		},
		async updateQueue(id, input) {
			const queue = queues.find((candidate) => candidate.id === id);
			if (!queue) return undefined;
			Object.assign(queue, input);
			return clone(updateTimestamp(queue));
		},
		async createQueueItem(input) {
			const active = activeItems(input.queueId);
			const position = input.position ?? active.length + 1;
			if (position > active.length + 1) {
				throw new Error("Queue position is out of range.");
			}
			for (const item of active) {
				if (item.position >= position) item.position += 1;
			}
			const item: QueueItem = {
				id: crypto.randomUUID(),
				queueId: input.queueId,
				name: input.name,
				description: input.description,
				inputIds: [...input.inputIds],
				position,
				readiness: "not_ready",
				status: "queued",
				createdAt: timestamp(),
				updatedAt: timestamp(),
			};
			queueItems.push(item);
			return clone(item);
		},
		async getQueueItem(id) {
			const item = queueItems.find((candidate) => candidate.id === id);
			return item ? clone(item) : undefined;
		},
		async listQueueItems(options) {
			return queueItems
				.filter(
					(item) =>
						item.queueId === options.queueId &&
						(options.includeDone || item.status !== "done"),
				)
				.sort((left, right) => left.position - right.position)
				.slice(0, options.limit)
				.map(clone);
		},
		async updateQueueItem(id, input) {
			const item = queueItems.find(
				(candidate) => candidate.id === id && candidate.status === "queued",
			);
			if (!item) return undefined;
			Object.assign(item, input);
			return clone(updateTimestamp(item));
		},
		async moveQueueItem(id, position) {
			const item = queueItems.find(
				(candidate) => candidate.id === id && candidate.status !== "done",
			);
			if (!item) return undefined;
			const active = activeItems(item.queueId);
			if (position > active.length)
				throw new Error("Queue position is out of range.");
			if (position < item.position) {
				for (const candidate of active) {
					if (
						candidate.position >= position &&
						candidate.position < item.position
					) {
						candidate.position += 1;
					}
				}
			} else if (position > item.position) {
				for (const candidate of active) {
					if (
						candidate.position > item.position &&
						candidate.position <= position
					) {
						candidate.position -= 1;
					}
				}
			}
			item.position = position;
			return clone(updateTimestamp(item));
		},
		async setQueueItemReadiness(id, readiness) {
			const item = queueItems.find(
				(candidate) => candidate.id === id && candidate.status === "queued",
			);
			if (!item) return undefined;
			item.readiness = readiness;
			return clone(updateTimestamp(item));
		},
		async getNextQueueItem(queueId, readiness) {
			const item = activeItems(queueId).find(
				(candidate) =>
					candidate.status === "queued" && candidate.readiness === readiness,
			);
			return item ? clone(item) : undefined;
		},
		async startQueueItem(id) {
			const item = queueItems.find(
				(candidate) =>
					candidate.id === id &&
					candidate.status === "queued" &&
					candidate.readiness === "ready",
			);
			if (!item) return undefined;
			item.status = "in_progress";
			item.startedAt = timestamp();
			return clone(updateTimestamp(item));
		},
		async completeQueueItem(id, input) {
			const item = queueItems.find(
				(candidate) =>
					candidate.id === id && candidate.status === "in_progress",
			);
			if (!item) return undefined;
			item.status = "done";
			item.completedAt = timestamp();
			item.completionSummary = input.completionSummary;
			for (const candidate of activeItems(item.queueId)) {
				if (candidate.position > item.position) candidate.position -= 1;
			}
			return clone(updateTimestamp(item));
		},
	};
}

describe("self-hosted Learning service", () => {
	test("shares Learning between ingest clients and agents", async () => {
		const store = createMemoryStore();
		const app = createServiceApp(store, store, {
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
		const store = createMemoryStore();
		const app = createServiceApp(store, store, {
			ingestToken: "ingest-secret",
			agentToken: "agent-secret",
		});
		const response = await app.request("/v1/observations", {
			headers: { authorization: "Bearer ingest-secret" },
		});
		expect(response.status).toBe(403);
	});

	test("develops Inputs into ordered execution-ready Queue Items", async () => {
		const store = createMemoryStore();
		const app = createServiceApp(store, store, {
			ingestToken: "ingest-secret",
			agentToken: "agent-secret",
		});
		const clientFetch = (input: RequestInfo | URL, init?: RequestInit) =>
			Promise.resolve(app.request(input, init));
		const agent = createRemoteQueueRepository({
			url: "http://guilloteam.test",
			token: "agent-secret",
			fetch: clientFetch,
		});
		const input = await agent.createInput({
			name: "Invitation friction",
			description: "Owners cannot recover from expired invitations.",
		});
		const updatedInput = await agent.updateInput(input.id, {
			description: "Owners cannot recover when an invitation expires.",
		});
		expect(updatedInput.description).toContain("expires");
		const queue = await agent.createQueue({ name: "Execution Queue" });
		const invitationRecovery = await agent.createQueueItem({
			queueId: queue.id,
			name: "Recover expired invitations",
			description: "Let owners resend an expired invitation.",
			inputIds: [input.id],
		});
		const onboarding = await agent.createQueueItem({
			queueId: queue.id,
			name: "Improve onboarding",
			description: "Clarify the empty team state.",
			inputIds: [],
		});
		const separateQueue = await agent.createQueue({ name: "Infrastructure" });
		const separateItem = await agent.createQueueItem({
			queueId: separateQueue.id,
			name: "Reduce database connections",
			description: "Bound the connection pool in worker deployments.",
			inputIds: [],
		});

		expect(await agent.listInputs({ unlinkedOnly: true })).toHaveLength(0);
		expect(
			(await agent.listQueueItems({ queueId: queue.id })).map(
				(item) => item.position,
			),
		).toEqual([1, 2]);
		await agent.moveQueueItem(onboarding.id, 1);
		expect((await agent.getNextQueueItem(queue.id, "not_ready"))?.id).toBe(
			onboarding.id,
		);
		await agent.setQueueItemReadiness(invitationRecovery.id, "ready");
		await agent.setQueueItemReadiness(separateItem.id, "ready");
		expect((await agent.getNextQueueItem(queue.id, "ready"))?.id).toBe(
			invitationRecovery.id,
		);
		expect((await agent.getNextQueueItem(separateQueue.id, "ready"))?.id).toBe(
			separateItem.id,
		);
		await agent.startQueueItem(invitationRecovery.id);
		await expect(agent.startQueueItem(invitationRecovery.id)).rejects.toThrow(
			"Queue Item",
		);
		await agent.completeQueueItem(invitationRecovery.id, {
			completionSummary: "Invitation recovery shipped.",
		});
		expect((await agent.getNextQueueItem(queue.id, "not_ready"))?.id).toBe(
			onboarding.id,
		);
		expect(await agent.listQueueItems({ queueId: queue.id })).toHaveLength(1);
		expect(
			await agent.listQueueItems({ queueId: queue.id, includeDone: true }),
		).toHaveLength(2);
	});

	test("prevents ingest credentials from reading or changing the execution queue", async () => {
		const store = createMemoryStore();
		const app = createServiceApp(store, store, {
			ingestToken: "ingest-secret",
			agentToken: "agent-secret",
		});
		const response = await app.request("/v1/inputs", {
			method: "POST",
			headers: { authorization: "Bearer ingest-secret" },
			body: JSON.stringify({ name: "Idea", description: "Do this." }),
		});
		expect(response.status).toBe(403);
	});
});
