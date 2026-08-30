import { describe, expect, test } from "bun:test";
import type {
	Evidence,
	Initiative,
	InitiativeQueueEntry,
	Input,
	LearningRepository,
	Noise,
	NoOpSynthesis,
	Observation,
	Project,
	ProjectInitiativeRepository,
	ProjectNoiseRepository,
	ProjectNoOpSynthesisRepository,
	Queue,
	QueueItem,
	QueueRepository,
	Team,
	TeamMember,
	TeamProjectRepository,
} from "@guilloteam/core";
import {
	createRemoteLearningRepository,
	createRemoteQueueRepository,
} from "@guilloteam/learning-client";
import { createServiceApp } from "../src/app";

function createMemoryStore(): LearningRepository &
	QueueRepository &
	TeamProjectRepository &
	ProjectNoiseRepository &
	ProjectInitiativeRepository &
	ProjectNoOpSynthesisRepository {
	const observations: Observation[] = [];
	const evidence: Evidence[] = [];
	const inputs: Input[] = [];
	const queues: Queue[] = [];
	const queueItems: QueueItem[] = [];
	const teams: Team[] = [];
	const teamMembers: TeamMember[] = [];
	const projects: Project[] = [];
	const noise: Noise[] = [];
	const initiatives: Initiative[] = [];
	const initiativeQueue: InitiativeQueueEntry[] = [];
	const noOpSyntheses: NoOpSynthesis[] = [];
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
		async createTeam(input) {
			const team: Team = {
				id: crypto.randomUUID(),
				name: input.name,
				createdAt: timestamp(),
				updatedAt: timestamp(),
			};
			teams.push(team);
			teamMembers.push({
				teamId: team.id,
				userId: input.ownerId,
				role: "owner",
				createdAt: timestamp(),
			});
			return clone(team);
		},
		async getTeam(id) {
			const team = teams.find((candidate) => candidate.id === id);
			return team ? clone(team) : undefined;
		},
		async joinTeam(teamId, userId) {
			const existing = teamMembers.find(
				(candidate) =>
					candidate.teamId === teamId && candidate.userId === userId,
			);
			if (existing) return clone(existing);
			const member: TeamMember = {
				teamId,
				userId,
				role: "member",
				createdAt: timestamp(),
			};
			teamMembers.push(member);
			return clone(member);
		},
		async getTeamMember(teamId, userId) {
			const member = teamMembers.find(
				(candidate) =>
					candidate.teamId === teamId && candidate.userId === userId,
			);
			return member ? clone(member) : undefined;
		},
		async createProject(input) {
			const project: Project = {
				id: crypto.randomUUID(),
				...input,
				createdAt: timestamp(),
				updatedAt: timestamp(),
			};
			projects.push(project);
			return clone(project);
		},
		async getProject(id) {
			const project = projects.find((candidate) => candidate.id === id);
			return project ? clone(project) : undefined;
		},
		async createNoise(input) {
			const item: Noise = {
				id: crypto.randomUUID(),
				...input,
				createdAt: timestamp(),
			};
			noise.push(item);
			return clone(item);
		},
		async getNoise(ids) {
			return noise.filter((item) => ids.includes(item.id)).map(clone);
		},
		async listNoise(projectId, options = {}) {
			return noise
				.filter((item) => item.projectId === projectId)
				.slice(0, options.limit)
				.map(clone);
		},
		async countNoise(projectId) {
			return noise.filter((item) => item.projectId === projectId).length;
		},
		async createInitiative(input) {
			const initiative: Initiative = {
				id: crypto.randomUUID(),
				...input,
				state: "signal",
				createdAt: timestamp(),
				updatedAt: timestamp(),
			};
			initiatives.push(initiative);
			return clone(initiative);
		},
		async getInitiative(id) {
			const initiative = initiatives.find((item) => item.id === id);
			return initiative ? clone(initiative) : undefined;
		},
		async attachNoise(initiativeId, noiseIds) {
			const initiative = initiatives.find((item) => item.id === initiativeId);
			if (!initiative) throw new Error("Failed to find Initiative.");
			initiative.noiseIds.push(...noiseIds);
			initiative.updatedAt = timestamp();
			return clone(initiative);
		},
		async updateInitiative(id, statement) {
			const initiative = initiatives.find(
				(item) =>
					item.id === id &&
					item.state === "signal" &&
					!item.mergedIntoInitiativeId,
			);
			if (!initiative) return undefined;
			initiative.statement = statement;
			initiative.updatedAt = timestamp();
			return clone(initiative);
		},
		async mergeInitiatives(input) {
			const survivor = initiatives.find(
				(item) => item.id === input.survivingInitiativeId,
			);
			if (!survivor) throw new Error("Failed to find surviving Initiative.");
			const seen = new Set(survivor.noiseIds);
			for (const absorbedId of input.absorbedInitiativeIds) {
				const absorbed = initiatives.find((item) => item.id === absorbedId);
				if (!absorbed) throw new Error("Failed to find absorbed Initiative.");
				for (const noiseId of absorbed.noiseIds) {
					if (!seen.has(noiseId)) {
						seen.add(noiseId);
						survivor.noiseIds.push(noiseId);
					}
				}
				absorbed.mergedIntoInitiativeId = survivor.id;
				absorbed.updatedAt = timestamp();
			}
			survivor.updatedAt = timestamp();
			return clone(survivor);
		},
		async graduateInitiative(initiativeId, projectId, queuedByUserId) {
			const initiative = initiatives.find(
				(item) =>
					item.id === initiativeId &&
					item.projectId === projectId &&
					item.state === "signal" &&
					!item.mergedIntoInitiativeId,
			);
			if (!initiative) return undefined;
			initiative.state = "queued";
			initiative.updatedAt = timestamp();
			initiativeQueue.push({
				initiativeId,
				projectId,
				position:
					initiativeQueue.filter((item) => item.projectId === projectId)
						.length + 1,
				queuedByUserId,
				queuedAt: timestamp(),
			});
			return clone(initiative);
		},
		async startNextInitiative(projectId, startedByUserId) {
			const next = initiativeQueue
				.filter((item) => item.projectId === projectId)
				.sort((left, right) => left.position - right.position)[0];
			if (!next) return undefined;
			const initiative = initiatives.find(
				(item) => item.id === next.initiativeId && item.state === "queued",
			);
			if (!initiative) return undefined;
			initiative.state = "executing";
			initiative.startedAt = timestamp();
			initiative.startedByUserId = startedByUserId;
			initiative.updatedAt = timestamp();
			const queueIndex = initiativeQueue.indexOf(next);
			initiativeQueue.splice(queueIndex, 1);
			for (const item of initiativeQueue) {
				if (item.projectId === projectId && item.position > next.position) {
					item.position -= 1;
				}
			}
			return clone(initiative);
		},
		async completeInitiative(initiativeId, completedByUserId, outcomeSummary) {
			const initiative = initiatives.find(
				(item) => item.id === initiativeId && item.state === "executing",
			);
			if (!initiative) return undefined;
			initiative.state = "completed";
			initiative.completedAt = timestamp();
			initiative.completedByUserId = completedByUserId;
			initiative.outcomeSummary = outcomeSummary;
			initiative.updatedAt = timestamp();
			return clone(initiative);
		},
		async createNoOpSynthesis(input) {
			const decision: NoOpSynthesis = {
				id: crypto.randomUUID(),
				...input,
				createdAt: timestamp(),
			};
			noOpSyntheses.push(decision);
			return clone(decision);
		},
		async listNoOpSyntheses(projectId, options = {}) {
			return noOpSyntheses
				.filter((item) => item.projectId === projectId)
				.slice(0, options.limit)
				.map(clone);
		},
		async listWorkshopInitiatives(projectId, options = {}) {
			return initiatives
				.filter(
					(item) =>
						item.projectId === projectId &&
						item.state === "signal" &&
						!item.mergedIntoInitiativeId,
				)
				.slice(0, options.limit)
				.map(clone);
		},
		async countWorkshopInitiatives(projectId) {
			return initiatives.filter(
				(item) =>
					item.projectId === projectId &&
					item.state === "signal" &&
					!item.mergedIntoInitiativeId,
			).length;
		},
		async listInitiativeQueue(projectId, options = {}) {
			return initiativeQueue
				.filter((item) => item.projectId === projectId)
				.sort((left, right) => left.position - right.position)
				.slice(0, options.limit)
				.map(clone);
		},
		async countInitiativeQueue(projectId) {
			return initiativeQueue.filter((item) => item.projectId === projectId)
				.length;
		},
		async countOutcomes(projectId) {
			return initiatives.filter(
				(item) => item.projectId === projectId && item.state === "completed",
			).length;
		},
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
	test("lets a joined user create a Project with empty work surfaces", async () => {
		const store = createMemoryStore();
		const app = createServiceApp(store, store, store, {
			ingestToken: "ingest-secret",
			agentToken: "agent-secret",
		});
		const headers = {
			authorization: "Bearer agent-secret",
			"content-type": "application/json",
		};

		const teamResponse = await app.request("/v1/teams", {
			method: "POST",
			headers,
			body: JSON.stringify({ name: "Guilloteam", ownerId: "ava" }),
		});
		expect(teamResponse.status).toBe(201);
		const team = (await teamResponse.json()) as { id: string; name: string };
		expect(team.name).toBe("Guilloteam");

		const joinResponse = await app.request(`/v1/teams/${team.id}/members`, {
			method: "POST",
			headers,
			body: JSON.stringify({ userId: "ben" }),
		});
		expect(joinResponse.status).toBe(201);

		const projectResponse = await app.request(`/v1/teams/${team.id}/projects`, {
			method: "POST",
			headers,
			body: JSON.stringify({ name: "Mobile app", userId: "ben" }),
		});
		expect(projectResponse.status).toBe(201);
		const project = (await projectResponse.json()) as {
			id: string;
			name: string;
			teamId: string;
		};
		expect(project).toMatchObject({ name: "Mobile app", teamId: team.id });

		const workspaceResponse = await app.request(
			`/v1/projects/${project.id}/workspace`,
			{ headers },
		);
		expect(workspaceResponse.status).toBe(200);
		expect(await workspaceResponse.json()).toEqual({
			projectId: project.id,
			noiseCount: 0,
			workshopCount: 0,
			queueCount: 0,
			outcomeCount: 0,
		});
	});

	test("captures Project-scoped Noise without leaking it to another Project", async () => {
		const store = createMemoryStore();
		const app = createServiceApp(store, store, store, {
			ingestToken: "ingest-secret",
			agentToken: "agent-secret",
		});
		const headers = {
			authorization: "Bearer agent-secret",
			"content-type": "application/json",
		};

		const team = (await (
			await app.request("/v1/teams", {
				method: "POST",
				headers,
				body: JSON.stringify({ name: "Guilloteam", ownerId: "ava" }),
			})
		).json()) as { id: string };
		await app.request(`/v1/teams/${team.id}/members`, {
			method: "POST",
			headers,
			body: JSON.stringify({ userId: "ben" }),
		});
		const mobileApp = (await (
			await app.request(`/v1/teams/${team.id}/projects`, {
				method: "POST",
				headers,
				body: JSON.stringify({ name: "Mobile app", userId: "ben" }),
			})
		).json()) as { id: string };
		const website = (await (
			await app.request(`/v1/teams/${team.id}/projects`, {
				method: "POST",
				headers,
				body: JSON.stringify({ name: "Website", userId: "ben" }),
			})
		).json()) as { id: string };

		const captureResponse = await app.request(
			`/v1/projects/${mobileApp.id}/noise`,
			{
				method: "POST",
				headers,
				body: JSON.stringify({
					content: "Make invitations recoverable.",
					source: "fleeting_thought",
					userId: "ben",
					metadata: { channel: "walk" },
				}),
			},
		);
		expect(captureResponse.status).toBe(201);
		expect(await captureResponse.json()).toMatchObject({
			projectId: mobileApp.id,
			content: "Make invitations recoverable.",
			source: "fleeting_thought",
			capturedByUserId: "ben",
			metadata: { channel: "walk" },
		});

		const mobileNoise = await app.request(
			`/v1/projects/${mobileApp.id}/noise`,
			{ headers },
		);
		expect(mobileNoise.status).toBe(200);
		expect(await mobileNoise.json()).toHaveLength(1);
		const websiteNoise = await app.request(`/v1/projects/${website.id}/noise`, {
			headers,
		});
		expect(websiteNoise.status).toBe(200);
		expect(await websiteNoise.json()).toEqual([]);

		const workspace = await app.request(
			`/v1/projects/${mobileApp.id}/workspace`,
			{ headers },
		);
		expect(await workspace.json()).toEqual({
			projectId: mobileApp.id,
			noiseCount: 1,
			workshopCount: 0,
			queueCount: 0,
			outcomeCount: 0,
		});
	});

	test("synthesizes Project Noise into a signal-state Workshop Initiative", async () => {
		const store = createMemoryStore();
		const app = createServiceApp(store, store, store, {
			ingestToken: "ingest-secret",
			agentToken: "agent-secret",
		});
		const headers = {
			authorization: "Bearer agent-secret",
			"content-type": "application/json",
		};
		const team = (await (
			await app.request("/v1/teams", {
				method: "POST",
				headers,
				body: JSON.stringify({ name: "Guilloteam", ownerId: "ava" }),
			})
		).json()) as { id: string };
		await app.request(`/v1/teams/${team.id}/members`, {
			method: "POST",
			headers,
			body: JSON.stringify({ userId: "ben" }),
		});
		const mobileApp = (await (
			await app.request(`/v1/teams/${team.id}/projects`, {
				method: "POST",
				headers,
				body: JSON.stringify({ name: "Mobile app", userId: "ben" }),
			})
		).json()) as { id: string };
		const website = (await (
			await app.request(`/v1/teams/${team.id}/projects`, {
				method: "POST",
				headers,
				body: JSON.stringify({ name: "Website", userId: "ben" }),
			})
		).json()) as { id: string };
		const capture = async (projectId: string, content: string) =>
			(await (
				await app.request(`/v1/projects/${projectId}/noise`, {
					method: "POST",
					headers,
					body: JSON.stringify({
						content,
						source: "conversation",
						userId: "ben",
					}),
				})
			).json()) as { id: string };
		const first = await capture(
			mobileApp.id,
			"Owners cannot recover expired invitations.",
		);
		const second = await capture(
			mobileApp.id,
			"Support sees repeated invitation recovery requests.",
		);
		const unrelated = await capture(website.id, "Simplify the home page.");

		const synthesisResponse = await app.request(
			`/v1/projects/${mobileApp.id}/initiatives/synthesize`,
			{
				method: "POST",
				headers,
				body: JSON.stringify({
					statement: "Make invitation recovery reliable.",
					noiseIds: [first.id, second.id],
					userId: "ben",
				}),
			},
		);
		expect(synthesisResponse.status).toBe(201);
		const initiative = (await synthesisResponse.json()) as {
			id: string;
			state: string;
			noiseIds: string[];
		};
		expect(initiative).toMatchObject({
			projectId: mobileApp.id,
			statement: "Make invitation recovery reliable.",
			state: "signal",
		});
		expect(initiative.noiseIds).toEqual([first.id, second.id]);

		const workshopResponse = await app.request(
			`/v1/projects/${mobileApp.id}/workshop`,
			{ headers },
		);
		expect(workshopResponse.status).toBe(200);
		expect(await workshopResponse.json()).toEqual([initiative]);
		const workspaceResponse = await app.request(
			`/v1/projects/${mobileApp.id}/workspace`,
			{ headers },
		);
		expect(await workspaceResponse.json()).toMatchObject({
			noiseCount: 2,
			workshopCount: 1,
		});

		const crossProjectResponse = await app.request(
			`/v1/projects/${mobileApp.id}/initiatives/synthesize`,
			{
				method: "POST",
				headers,
				body: JSON.stringify({
					statement: "This must be rejected.",
					noiseIds: [unrelated.id],
					userId: "ben",
				}),
			},
		);
		expect(crossProjectResponse.status).toBe(400);
		expect(await crossProjectResponse.json()).toEqual({
			error: `Noise must belong to Project: ${unrelated.id}`,
		});
	});

	test("adds Project Noise to an existing signal-state Initiative", async () => {
		const store = createMemoryStore();
		const app = createServiceApp(store, store, store, {
			ingestToken: "ingest-secret",
			agentToken: "agent-secret",
		});
		const headers = {
			authorization: "Bearer agent-secret",
			"content-type": "application/json",
		};
		const team = (await (
			await app.request("/v1/teams", {
				method: "POST",
				headers,
				body: JSON.stringify({ name: "Guilloteam", ownerId: "ava" }),
			})
		).json()) as { id: string };
		await app.request(`/v1/teams/${team.id}/members`, {
			method: "POST",
			headers,
			body: JSON.stringify({ userId: "ben" }),
		});
		const project = (await (
			await app.request(`/v1/teams/${team.id}/projects`, {
				method: "POST",
				headers,
				body: JSON.stringify({ name: "Mobile app", userId: "ben" }),
			})
		).json()) as { id: string };
		const capture = async (content: string) =>
			(await (
				await app.request(`/v1/projects/${project.id}/noise`, {
					method: "POST",
					headers,
					body: JSON.stringify({
						content,
						source: "conversation",
						userId: "ben",
					}),
				})
			).json()) as { id: string };
		const originalNoise = await capture("Invitation recovery is confusing.");
		const additionalNoise = await capture(
			"Support receives repeated invitation recovery requests.",
		);
		const initiative = (await (
			await app.request(`/v1/projects/${project.id}/initiatives/synthesize`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					statement: "Make invitation recovery reliable.",
					noiseIds: [originalNoise.id],
					userId: "ben",
				}),
			})
		).json()) as { id: string };

		const attachResponse = await app.request(
			`/v1/projects/${project.id}/initiatives/${initiative.id}/noise`,
			{
				method: "POST",
				headers,
				body: JSON.stringify({
					noiseIds: [additionalNoise.id],
					userId: "ben",
				}),
			},
		);
		expect(attachResponse.status).toBe(200);
		expect(await attachResponse.json()).toMatchObject({
			id: initiative.id,
			state: "signal",
			noiseIds: [originalNoise.id, additionalNoise.id],
		});

		const duplicateResponse = await app.request(
			`/v1/projects/${project.id}/initiatives/${initiative.id}/noise`,
			{
				method: "POST",
				headers,
				body: JSON.stringify({
					noiseIds: [additionalNoise.id],
					userId: "ben",
				}),
			},
		);
		expect(duplicateResponse.status).toBe(400);
		expect(await duplicateResponse.json()).toEqual({
			error: `Noise already supports Initiative: ${additionalNoise.id}`,
		});
	});

	test("records a deferred synthesis decision without creating a Workshop Initiative", async () => {
		const store = createMemoryStore();
		const app = createServiceApp(store, store, store, {
			ingestToken: "ingest-secret",
			agentToken: "agent-secret",
		});
		const headers = {
			authorization: "Bearer agent-secret",
			"content-type": "application/json",
		};
		const team = (await (
			await app.request("/v1/teams", {
				method: "POST",
				headers,
				body: JSON.stringify({ name: "Guilloteam", ownerId: "ava" }),
			})
		).json()) as { id: string };
		await app.request(`/v1/teams/${team.id}/members`, {
			method: "POST",
			headers,
			body: JSON.stringify({ userId: "ben" }),
		});
		const project = (await (
			await app.request(`/v1/teams/${team.id}/projects`, {
				method: "POST",
				headers,
				body: JSON.stringify({ name: "Mobile app", userId: "ben" }),
			})
		).json()) as { id: string };
		const noise = (await (
			await app.request(`/v1/projects/${project.id}/noise`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					content: "A single anecdote mentions a theme toggle.",
					source: "conversation",
					userId: "ben",
				}),
			})
		).json()) as { id: string };

		const decisionResponse = await app.request(
			`/v1/projects/${project.id}/syntheses/deferred`,
			{
				method: "POST",
				headers,
				body: JSON.stringify({
					noiseIds: [noise.id],
					rationale: "One anecdote is not enough to prioritize work.",
					userId: "ben",
				}),
			},
		);
		expect(decisionResponse.status).toBe(201);
		const decision = (await decisionResponse.json()) as {
			id: string;
			noiseIds: string[];
		};
		expect(decision).toMatchObject({
			projectId: project.id,
			rationale: "One anecdote is not enough to prioritize work.",
			requestedByUserId: "ben",
			noiseIds: [noise.id],
		});

		const decisionsResponse = await app.request(
			`/v1/projects/${project.id}/syntheses/deferred`,
			{ headers },
		);
		expect(await decisionsResponse.json()).toEqual([decision]);
		const workshopResponse = await app.request(
			`/v1/projects/${project.id}/workshop`,
			{ headers },
		);
		expect(await workshopResponse.json()).toEqual([]);
		const workspaceResponse = await app.request(
			`/v1/projects/${project.id}/workspace`,
			{ headers },
		);
		expect(await workspaceResponse.json()).toMatchObject({
			noiseCount: 1,
			workshopCount: 0,
		});
		const noiseResponse = await app.request(
			`/v1/projects/${project.id}/noise`,
			{ headers },
		);
		expect(await noiseResponse.json()).toHaveLength(1);
	});

	test("merges and edits Workshop Initiatives before a user graduates one to the Project queue", async () => {
		const store = createMemoryStore();
		const app = createServiceApp(store, store, store, {
			ingestToken: "ingest-secret",
			agentToken: "agent-secret",
			userToken: "user-secret",
		});
		const agentHeaders = {
			authorization: "Bearer agent-secret",
			"content-type": "application/json",
		};
		const userHeaders = {
			authorization: "Bearer user-secret",
			"content-type": "application/json",
		};
		const team = (await (
			await app.request("/v1/teams", {
				method: "POST",
				headers: agentHeaders,
				body: JSON.stringify({ name: "Guilloteam", ownerId: "ava" }),
			})
		).json()) as { id: string };
		await app.request(`/v1/teams/${team.id}/members`, {
			method: "POST",
			headers: agentHeaders,
			body: JSON.stringify({ userId: "ben" }),
		});
		const project = (await (
			await app.request(`/v1/teams/${team.id}/projects`, {
				method: "POST",
				headers: agentHeaders,
				body: JSON.stringify({ name: "Mobile app", userId: "ben" }),
			})
		).json()) as { id: string };
		const capture = async (content: string) =>
			(await (
				await app.request(`/v1/projects/${project.id}/noise`, {
					method: "POST",
					headers: agentHeaders,
					body: JSON.stringify({
						content,
						source: "conversation",
						userId: "ben",
					}),
				})
			).json()) as { id: string };
		const firstNoise = await capture("Owners cannot recover invitations.");
		const secondNoise = await capture("Support sees recovery requests.");
		const synthesize = async (statement: string, noiseId: string) =>
			(await (
				await app.request(`/v1/projects/${project.id}/initiatives/synthesize`, {
					method: "POST",
					headers: agentHeaders,
					body: JSON.stringify({
						statement,
						noiseIds: [noiseId],
						userId: "ben",
					}),
				})
			).json()) as { id: string };
		const survivor = await synthesize(
			"Improve invitation recovery.",
			firstNoise.id,
		);
		const absorbed = await synthesize(
			"Handle invitation support burden.",
			secondNoise.id,
		);

		const editResponse = await app.request(
			`/v1/projects/${project.id}/initiatives/${survivor.id}`,
			{
				method: "PATCH",
				headers: agentHeaders,
				body: JSON.stringify({
					statement: "Make invitation recovery reliable.",
					userId: "ben",
				}),
			},
		);
		expect(editResponse.status).toBe(200);

		const mergeResponse = await app.request(
			`/v1/projects/${project.id}/initiatives/${survivor.id}/merge`,
			{
				method: "POST",
				headers: agentHeaders,
				body: JSON.stringify({
					absorbedInitiativeIds: [absorbed.id],
					userId: "ben",
				}),
			},
		);
		expect(mergeResponse.status).toBe(200);
		expect(await mergeResponse.json()).toMatchObject({
			id: survivor.id,
			statement: "Make invitation recovery reliable.",
			noiseIds: [firstNoise.id, secondNoise.id],
		});
		const absorbedResponse = await app.request(
			`/v1/projects/${project.id}/initiatives/${absorbed.id}`,
			{ headers: agentHeaders },
		);
		expect(await absorbedResponse.json()).toMatchObject({
			id: absorbed.id,
			mergedIntoInitiativeId: survivor.id,
			noiseIds: [secondNoise.id],
		});

		const agentGraduationResponse = await app.request(
			`/v1/projects/${project.id}/initiatives/${survivor.id}/graduate`,
			{
				method: "POST",
				headers: agentHeaders,
				body: JSON.stringify({ userId: "ben" }),
			},
		);
		expect(agentGraduationResponse.status).toBe(403);
		const graduationResponse = await app.request(
			`/v1/projects/${project.id}/initiatives/${survivor.id}/graduate`,
			{
				method: "POST",
				headers: userHeaders,
				body: JSON.stringify({ userId: "ben" }),
			},
		);
		expect(graduationResponse.status).toBe(200);
		expect(await graduationResponse.json()).toMatchObject({
			id: survivor.id,
			state: "queued",
		});
		const workshopResponse = await app.request(
			`/v1/projects/${project.id}/workshop`,
			{ headers: agentHeaders },
		);
		expect(await workshopResponse.json()).toEqual([]);
		const queueResponse = await app.request(
			`/v1/projects/${project.id}/queue`,
			{ headers: agentHeaders },
		);
		expect(await queueResponse.json()).toMatchObject([
			{ initiativeId: survivor.id, position: 1, queuedByUserId: "ben" },
		]);
		const workspaceResponse = await app.request(
			`/v1/projects/${project.id}/workspace`,
			{ headers: agentHeaders },
		);
		expect(await workspaceResponse.json()).toMatchObject({
			workshopCount: 0,
			queueCount: 1,
		});
	});

	test("starts only the next Project Initiative and advances the waiting queue", async () => {
		const store = createMemoryStore();
		const app = createServiceApp(store, store, store, {
			ingestToken: "ingest-secret",
			agentToken: "agent-secret",
			userToken: "user-secret",
		});
		const agentHeaders = {
			authorization: "Bearer agent-secret",
			"content-type": "application/json",
		};
		const userHeaders = {
			authorization: "Bearer user-secret",
			"content-type": "application/json",
		};
		const team = (await (
			await app.request("/v1/teams", {
				method: "POST",
				headers: agentHeaders,
				body: JSON.stringify({ name: "Guilloteam", ownerId: "ben" }),
			})
		).json()) as { id: string };
		const project = (await (
			await app.request(`/v1/teams/${team.id}/projects`, {
				method: "POST",
				headers: agentHeaders,
				body: JSON.stringify({ name: "Mobile app", userId: "ben" }),
			})
		).json()) as { id: string };
		const synthesize = async (statement: string) => {
			const noise = (await (
				await app.request(`/v1/projects/${project.id}/noise`, {
					method: "POST",
					headers: agentHeaders,
					body: JSON.stringify({
						content: statement,
						source: "conversation",
						userId: "ben",
					}),
				})
			).json()) as { id: string };
			return (await (
				await app.request(`/v1/projects/${project.id}/initiatives/synthesize`, {
					method: "POST",
					headers: agentHeaders,
					body: JSON.stringify({
						statement,
						noiseIds: [noise.id],
						userId: "ben",
					}),
				})
			).json()) as { id: string };
		};
		const first = await synthesize("Make invitation recovery reliable.");
		const second = await synthesize("Improve empty-state onboarding.");
		for (const initiative of [first, second]) {
			const response = await app.request(
				`/v1/projects/${project.id}/initiatives/${initiative.id}/graduate`,
				{
					method: "POST",
					headers: userHeaders,
					body: JSON.stringify({ userId: "ben" }),
				},
			);
			expect(response.status).toBe(200);
		}

		const agentStartResponse = await app.request(
			`/v1/projects/${project.id}/queue/start-next`,
			{
				method: "POST",
				headers: agentHeaders,
				body: JSON.stringify({ userId: "ben" }),
			},
		);
		expect(agentStartResponse.status).toBe(403);
		const startResponse = await app.request(
			`/v1/projects/${project.id}/queue/start-next`,
			{
				method: "POST",
				headers: userHeaders,
				body: JSON.stringify({ userId: "ben" }),
			},
		);
		expect(startResponse.status).toBe(200);
		expect(await startResponse.json()).toMatchObject({
			id: first.id,
			state: "executing",
			startedByUserId: "ben",
		});
		const queueResponse = await app.request(
			`/v1/projects/${project.id}/queue`,
			{ headers: agentHeaders },
		);
		expect(await queueResponse.json()).toMatchObject([
			{ initiativeId: second.id, position: 1 },
		]);
	});

	test("completes an executing Initiative with a Project outcome", async () => {
		const store = createMemoryStore();
		const app = createServiceApp(store, store, store, {
			ingestToken: "ingest-secret",
			agentToken: "agent-secret",
			userToken: "user-secret",
		});
		const agentHeaders = {
			authorization: "Bearer agent-secret",
			"content-type": "application/json",
		};
		const userHeaders = {
			authorization: "Bearer user-secret",
			"content-type": "application/json",
		};
		const team = (await (
			await app.request("/v1/teams", {
				method: "POST",
				headers: agentHeaders,
				body: JSON.stringify({ name: "Guilloteam", ownerId: "ben" }),
			})
		).json()) as { id: string };
		const project = (await (
			await app.request(`/v1/teams/${team.id}/projects`, {
				method: "POST",
				headers: agentHeaders,
				body: JSON.stringify({ name: "Mobile app", userId: "ben" }),
			})
		).json()) as { id: string };
		const noise = (await (
			await app.request(`/v1/projects/${project.id}/noise`, {
				method: "POST",
				headers: agentHeaders,
				body: JSON.stringify({
					content: "Owners need invitation recovery.",
					source: "conversation",
					userId: "ben",
				}),
			})
		).json()) as { id: string };
		const initiative = (await (
			await app.request(`/v1/projects/${project.id}/initiatives/synthesize`, {
				method: "POST",
				headers: agentHeaders,
				body: JSON.stringify({
					statement: "Make invitation recovery reliable.",
					noiseIds: [noise.id],
					userId: "ben",
				}),
			})
		).json()) as { id: string };
		for (const path of [
			`/v1/projects/${project.id}/initiatives/${initiative.id}/graduate`,
			`/v1/projects/${project.id}/queue/start-next`,
		]) {
			const response = await app.request(path, {
				method: "POST",
				headers: userHeaders,
				body: JSON.stringify({ userId: "ben" }),
			});
			expect(response.status).toBe(200);
		}

		const agentCompletionResponse = await app.request(
			`/v1/projects/${project.id}/initiatives/${initiative.id}/complete`,
			{
				method: "POST",
				headers: agentHeaders,
				body: JSON.stringify({
					userId: "ben",
					outcomeSummary: "Owners can now recover expired invitations.",
				}),
			},
		);
		expect(agentCompletionResponse.status).toBe(403);
		const completionResponse = await app.request(
			`/v1/projects/${project.id}/initiatives/${initiative.id}/complete`,
			{
				method: "POST",
				headers: userHeaders,
				body: JSON.stringify({
					userId: "ben",
					outcomeSummary: "Owners can now recover expired invitations.",
				}),
			},
		);
		expect(completionResponse.status).toBe(200);
		expect(await completionResponse.json()).toMatchObject({
			id: initiative.id,
			state: "completed",
			completedByUserId: "ben",
			outcomeSummary: "Owners can now recover expired invitations.",
		});
		const workspaceResponse = await app.request(
			`/v1/projects/${project.id}/workspace`,
			{ headers: agentHeaders },
		);
		expect(await workspaceResponse.json()).toMatchObject({
			queueCount: 0,
			outcomeCount: 1,
		});
	});

	test("shares Learning between ingest clients and agents", async () => {
		const store = createMemoryStore();
		const app = createServiceApp(store, store, store, {
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
		const app = createServiceApp(store, store, store, {
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
		const app = createServiceApp(store, store, store, {
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
		if (!updatedInput) {
			throw new Error("Expected the Input update to return the updated Input.");
		}
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
		const app = createServiceApp(store, store, store, {
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
