import type {
	AttachInitiativeNoiseInput,
	CompleteInitiativeInput,
	CompleteQueueItemInput,
	EvidenceInput,
	GraduateInitiativeInput,
	InputInput,
	InputUpdate,
	LearningRepository,
	MergeInitiativesInput,
	NoiseInput,
	NoOpSynthesisInput,
	ObservationInput,
	ProjectInitiativeRepository,
	ProjectInput,
	ProjectNoiseRepository,
	ProjectNoOpSynthesisRepository,
	QueueInput,
	QueueItemInput,
	QueueItemReadiness,
	QueueItemUpdate,
	QueueRepository,
	QueueUpdate,
	StartNextInitiativeInput,
	SynthesizeNoiseInput,
	TeamInput,
	TeamProjectRepository,
	UpdateInitiativeInput,
} from "./model";
import {
	evidenceInputSchema,
	observationInputSchema,
	parseAttachInitiativeNoiseInput,
	parseCompleteInitiativeInput,
	parseCompleteQueueItemInput,
	parseGraduateInitiativeInput,
	parseInputInput,
	parseInputUpdate,
	parseJoinTeamInput,
	parseMergeInitiativesInput,
	parseMoveQueueItemInput,
	parseNoiseInput,
	parseNoOpSynthesisInput,
	parseProjectInput,
	parseQueueInput,
	parseQueueItemInput,
	parseQueueItemReadiness,
	parseQueueItemUpdate,
	parseStartNextInitiativeInput,
	parseSynthesizeNoiseInput,
	parseTeamInput,
	parseUpdateInitiativeInput,
} from "./model";
import { readIntent } from "./project";

export function createProductContext(
	root: string,
	learning: LearningRepository,
) {
	return {
		async observe(raw: ObservationInput) {
			return learning.createObservation(observationInputSchema.parse(raw));
		},
		async createEvidence(raw: EvidenceInput) {
			const input = evidenceInputSchema.parse(raw);
			const uniqueIds = [...new Set(input.observationIds)];
			if (uniqueIds.length !== input.observationIds.length) {
				throw new Error(
					"Evidence cannot cite the same observation more than once.",
				);
			}
			const observations = await learning.getObservations(uniqueIds);
			const found = new Set(observations.map((item) => item.id));
			const missing = uniqueIds.filter((id) => !found.has(id));
			if (missing.length)
				throw new Error(`Unknown observation IDs: ${missing.join(", ")}`);
			return learning.createEvidence({ ...input, observationIds: uniqueIds });
		},
		getIntent: () => readIntent(root),
		listObservations: (options?: {
			unsynthesizedOnly?: boolean;
			limit?: number;
		}) => learning.listObservations(options),
		listEvidence: (options?: { limit?: number }) =>
			learning.listEvidence(options),
		async getPendingContextWork() {
			const observations = await learning.listObservations({
				unsynthesizedOnly: true,
				limit: 500,
			});
			return {
				unsynthesizedObservationCount: observations.length,
				recommendedAction: observations.length ? "synthesize_evidence" : "none",
			};
		},
		async getProductContext() {
			const [intent, observations, evidence] = await Promise.all([
				readIntent(root),
				learning.listObservations({ limit: 100 }),
				learning.listEvidence({ limit: 100 }),
			]);
			return { intent, learning: { observations, evidence } };
		},
	};
}

function uniqueIds(ids: string[], label: string) {
	const unique = [...new Set(ids)];
	if (unique.length !== ids.length) {
		throw new Error(`${label} cannot contain the same Input more than once.`);
	}
	return unique;
}

export function createExecutionQueue(queue: QueueRepository) {
	const ensureQueue = async (id: string) => {
		const found = await queue.getQueue(id);
		if (!found) throw new Error(`Unknown Queue ID: ${id}`);
		return found;
	};

	const ensureInputs = async (ids: string[]) => {
		const unique = uniqueIds(ids, "A Queue Item");
		if (!unique.length) return unique;
		const inputs = await queue.getInputs(unique);
		const found = new Set(inputs.map((input) => input.id));
		const missing = unique.filter((id) => !found.has(id));
		if (missing.length)
			throw new Error(`Unknown Input IDs: ${missing.join(", ")}`);
		return unique;
	};

	const getInput = async (id: string) => {
		const [input] = await queue.getInputs([id]);
		if (!input) throw new Error(`Unknown Input ID: ${id}`);
		return input;
	};

	const getQueueItem = async (id: string) => {
		const item = await queue.getQueueItem(id);
		if (!item) throw new Error(`Unknown Queue Item ID: ${id}`);
		return item;
	};

	return {
		createInput(raw: InputInput) {
			return queue.createInput(parseInputInput(raw));
		},
		listInputs(options?: { unlinkedOnly?: boolean; limit?: number }) {
			return queue.listInputs(options);
		},
		getInput,
		async updateInput(id: string, raw: InputUpdate) {
			const input = parseInputUpdate(raw);
			const updated = await queue.updateInput(id, input);
			if (!updated) throw new Error(`Unknown Input ID: ${id}`);
			return updated;
		},
		createQueue(raw: QueueInput) {
			return queue.createQueue(parseQueueInput(raw));
		},
		listQueues(options?: { limit?: number }) {
			return queue.listQueues(options);
		},
		async getQueue(id: string) {
			return ensureQueue(id);
		},
		async updateQueue(id: string, raw: QueueUpdate) {
			const updated = await queue.updateQueue(id, parseQueueInput(raw));
			if (!updated) throw new Error(`Unknown Queue ID: ${id}`);
			return updated;
		},
		async createQueueItem(raw: QueueItemInput) {
			const input = parseQueueItemInput(raw);
			await ensureQueue(input.queueId);
			return queue.createQueueItem({
				...input,
				inputIds: await ensureInputs(input.inputIds ?? []),
			});
		},
		getQueueItem,
		async listQueueItems(options: {
			queueId: string;
			includeDone?: boolean;
			limit?: number;
		}) {
			await ensureQueue(options.queueId);
			return queue.listQueueItems(options);
		},
		async updateQueueItem(id: string, raw: QueueItemUpdate) {
			const current = await getQueueItem(id);
			if (current.status !== "queued") {
				throw new Error("Only queued Queue Items can be updated.");
			}
			const input = parseQueueItemUpdate(raw);
			const inputIds = input.inputIds
				? await ensureInputs(input.inputIds)
				: undefined;
			const updated = await queue.updateQueueItem(id, { ...input, inputIds });
			if (!updated)
				throw new Error("Queue Item changed while it was being updated.");
			return updated;
		},
		async moveQueueItem(id: string, raw: { position: number }) {
			const current = await getQueueItem(id);
			if (current.status === "done") {
				throw new Error("Completed Queue Items cannot be moved.");
			}
			const { position } = parseMoveQueueItemInput(raw);
			const moved = await queue.moveQueueItem(id, position);
			if (!moved)
				throw new Error("Queue Item changed while it was being moved.");
			return moved;
		},
		async setQueueItemReadiness(id: string, raw: QueueItemReadiness) {
			const current = await getQueueItem(id);
			if (current.status !== "queued") {
				throw new Error("Only queued Queue Items can change readiness.");
			}
			const readiness = parseQueueItemReadiness(raw);
			const updated = await queue.setQueueItemReadiness(id, readiness);
			if (!updated)
				throw new Error("Queue Item changed while its readiness was updated.");
			return updated;
		},
		async getNextToPrepare(queueId: string) {
			await ensureQueue(queueId);
			return queue.getNextQueueItem(queueId, "not_ready");
		},
		async getNextToExecute(queueId: string) {
			await ensureQueue(queueId);
			return queue.getNextQueueItem(queueId, "ready");
		},
		async startQueueItem(id: string) {
			const current = await getQueueItem(id);
			if (current.status !== "queued" || current.readiness !== "ready") {
				throw new Error("Only ready, queued Queue Items can be started.");
			}
			const started = await queue.startQueueItem(id);
			if (!started)
				throw new Error("Queue Item was already started or changed.");
			return started;
		},
		async completeQueueItem(id: string, raw: CompleteQueueItemInput) {
			const current = await getQueueItem(id);
			if (current.status !== "in_progress") {
				throw new Error("Only in-progress Queue Items can be completed.");
			}
			const completed = await queue.completeQueueItem(
				id,
				parseCompleteQueueItemInput(raw),
			);
			if (!completed)
				throw new Error("Queue Item changed while it was being completed.");
			return completed;
		},
	};
}

export function createTeamWorkspace(
	repository: TeamProjectRepository &
		ProjectNoiseRepository &
		ProjectInitiativeRepository &
		ProjectNoOpSynthesisRepository,
) {
	const getTeam = async (id: string) => {
		const team = await repository.getTeam(id);
		if (!team) throw new Error(`Unknown Team ID: ${id}`);
		return team;
	};

	return {
		createTeam(raw: TeamInput) {
			return repository.createTeam(parseTeamInput(raw));
		},
		async joinTeam(teamId: string, raw: { userId: string }) {
			await getTeam(teamId);
			return repository.joinTeam(teamId, parseJoinTeamInput(raw).userId);
		},
		async createProject(teamId: string, raw: ProjectInput) {
			await getTeam(teamId);
			const input = parseProjectInput(raw);
			const member = await repository.getTeamMember(teamId, input.userId);
			if (!member)
				throw new Error("A Project creator must belong to the Team.");
			return repository.createProject({
				teamId,
				name: input.name,
				createdByUserId: input.userId,
			});
		},
		async captureNoise(projectId: string, raw: NoiseInput) {
			const project = await repository.getProject(projectId);
			if (!project) throw new Error(`Unknown Project ID: ${projectId}`);
			const input = parseNoiseInput(raw);
			const member = await repository.getTeamMember(
				project.teamId,
				input.userId,
			);
			if (!member) throw new Error("A Noise capturer must belong to the Team.");
			return repository.createNoise({
				projectId: project.id,
				content: input.content,
				source: input.source,
				capturedByUserId: input.userId,
				metadata: input.metadata ?? {},
			});
		},
		async listNoise(projectId: string, options?: { limit?: number }) {
			const project = await repository.getProject(projectId);
			if (!project) throw new Error(`Unknown Project ID: ${projectId}`);
			return repository.listNoise(project.id, options);
		},
		async synthesizeNoise(projectId: string, raw: SynthesizeNoiseInput) {
			const project = await repository.getProject(projectId);
			if (!project) throw new Error(`Unknown Project ID: ${projectId}`);
			const input = parseSynthesizeNoiseInput(raw);
			const member = await repository.getTeamMember(
				project.teamId,
				input.userId,
			);
			if (!member) {
				throw new Error("A synthesis requester must belong to the Team.");
			}
			const uniqueNoiseIds = [...new Set(input.noiseIds)];
			if (uniqueNoiseIds.length !== input.noiseIds.length) {
				throw new Error("Synthesis cannot cite the same Noise more than once.");
			}
			const noise = await repository.getNoise(uniqueNoiseIds);
			const found = new Set(noise.map((item) => item.id));
			const missing = uniqueNoiseIds.filter((id) => !found.has(id));
			if (missing.length) {
				throw new Error(`Unknown Noise IDs: ${missing.join(", ")}`);
			}
			const unrelated = noise.filter((item) => item.projectId !== project.id);
			if (unrelated.length) {
				throw new Error(
					`Noise must belong to Project: ${unrelated.map((item) => item.id).join(", ")}`,
				);
			}
			return repository.createInitiative({
				projectId: project.id,
				statement: input.statement,
				noiseIds: uniqueNoiseIds,
			});
		},
		async attachNoiseToInitiative(
			projectId: string,
			initiativeId: string,
			raw: AttachInitiativeNoiseInput,
		) {
			const project = await repository.getProject(projectId);
			if (!project) throw new Error(`Unknown Project ID: ${projectId}`);
			const input = parseAttachInitiativeNoiseInput(raw);
			const member = await repository.getTeamMember(
				project.teamId,
				input.userId,
			);
			if (!member) {
				throw new Error("A synthesis requester must belong to the Team.");
			}
			const initiative = await repository.getInitiative(initiativeId);
			if (!initiative)
				throw new Error(`Unknown Initiative ID: ${initiativeId}`);
			if (initiative.projectId !== project.id) {
				throw new Error("Initiative must belong to the Project.");
			}
			if (initiative.state !== "signal") {
				throw new Error("Noise can only be added to signal-state Initiatives.");
			}
			const uniqueNoiseIds = [...new Set(input.noiseIds)];
			if (uniqueNoiseIds.length !== input.noiseIds.length) {
				throw new Error("Synthesis cannot cite the same Noise more than once.");
			}
			const noise = await repository.getNoise(uniqueNoiseIds);
			const found = new Set(noise.map((item) => item.id));
			const missing = uniqueNoiseIds.filter((id) => !found.has(id));
			if (missing.length) {
				throw new Error(`Unknown Noise IDs: ${missing.join(", ")}`);
			}
			const unrelated = noise.filter((item) => item.projectId !== project.id);
			if (unrelated.length) {
				throw new Error(
					`Noise must belong to Project: ${unrelated.map((item) => item.id).join(", ")}`,
				);
			}
			const alreadySupporting = uniqueNoiseIds.filter((id) =>
				initiative.noiseIds.includes(id),
			);
			if (alreadySupporting.length) {
				throw new Error(
					`Noise already supports Initiative: ${alreadySupporting.join(", ")}`,
				);
			}
			return repository.attachNoise(initiative.id, uniqueNoiseIds);
		},
		async recordNoOpSynthesis(projectId: string, raw: NoOpSynthesisInput) {
			const project = await repository.getProject(projectId);
			if (!project) throw new Error(`Unknown Project ID: ${projectId}`);
			const input = parseNoOpSynthesisInput(raw);
			const member = await repository.getTeamMember(
				project.teamId,
				input.userId,
			);
			if (!member) {
				throw new Error("A synthesis requester must belong to the Team.");
			}
			const uniqueNoiseIds = [...new Set(input.noiseIds)];
			if (uniqueNoiseIds.length !== input.noiseIds.length) {
				throw new Error("Synthesis cannot cite the same Noise more than once.");
			}
			const noise = await repository.getNoise(uniqueNoiseIds);
			const found = new Set(noise.map((item) => item.id));
			const missing = uniqueNoiseIds.filter((id) => !found.has(id));
			if (missing.length) {
				throw new Error(`Unknown Noise IDs: ${missing.join(", ")}`);
			}
			const unrelated = noise.filter((item) => item.projectId !== project.id);
			if (unrelated.length) {
				throw new Error(
					`Noise must belong to Project: ${unrelated.map((item) => item.id).join(", ")}`,
				);
			}
			return repository.createNoOpSynthesis({
				projectId: project.id,
				noiseIds: uniqueNoiseIds,
				rationale: input.rationale,
				requestedByUserId: input.userId,
			});
		},
		async updateInitiative(
			projectId: string,
			initiativeId: string,
			raw: UpdateInitiativeInput,
		) {
			const project = await repository.getProject(projectId);
			if (!project) throw new Error(`Unknown Project ID: ${projectId}`);
			const input = parseUpdateInitiativeInput(raw);
			const member = await repository.getTeamMember(
				project.teamId,
				input.userId,
			);
			if (!member) {
				throw new Error("An Initiative editor must belong to the Team.");
			}
			const initiative = await repository.getInitiative(initiativeId);
			if (!initiative)
				throw new Error(`Unknown Initiative ID: ${initiativeId}`);
			if (initiative.projectId !== project.id) {
				throw new Error("Initiative must belong to the Project.");
			}
			if (initiative.state !== "signal" || initiative.mergedIntoInitiativeId) {
				throw new Error(
					"Only unmerged signal-state Initiatives can be edited.",
				);
			}
			const updated = await repository.updateInitiative(
				initiative.id,
				input.statement,
			);
			if (!updated)
				throw new Error("Initiative changed while it was being edited.");
			return updated;
		},
		async getInitiative(projectId: string, initiativeId: string) {
			const project = await repository.getProject(projectId);
			if (!project) throw new Error(`Unknown Project ID: ${projectId}`);
			const initiative = await repository.getInitiative(initiativeId);
			if (!initiative)
				throw new Error(`Unknown Initiative ID: ${initiativeId}`);
			if (initiative.projectId !== project.id) {
				throw new Error("Initiative must belong to the Project.");
			}
			return initiative;
		},
		async mergeInitiatives(
			projectId: string,
			survivingInitiativeId: string,
			raw: MergeInitiativesInput,
		) {
			const project = await repository.getProject(projectId);
			if (!project) throw new Error(`Unknown Project ID: ${projectId}`);
			const input = parseMergeInitiativesInput(raw);
			const member = await repository.getTeamMember(
				project.teamId,
				input.userId,
			);
			if (!member) {
				throw new Error("An Initiative merger must belong to the Team.");
			}
			const uniqueAbsorbedIds = [...new Set(input.absorbedInitiativeIds)];
			if (uniqueAbsorbedIds.length !== input.absorbedInitiativeIds.length) {
				throw new Error(
					"A merge cannot absorb the same Initiative more than once.",
				);
			}
			if (uniqueAbsorbedIds.includes(survivingInitiativeId)) {
				throw new Error("A merge cannot absorb its surviving Initiative.");
			}
			const [survivor, ...absorbed] = await Promise.all([
				repository.getInitiative(survivingInitiativeId),
				...uniqueAbsorbedIds.map((id) => repository.getInitiative(id)),
			]);
			if (!survivor) {
				throw new Error(`Unknown Initiative ID: ${survivingInitiativeId}`);
			}
			const missing = uniqueAbsorbedIds.flatMap((id, index) =>
				absorbed[index] ? [] : [id],
			);
			if (missing.length) {
				throw new Error(`Unknown Initiative IDs: ${missing.join(", ")}`);
			}
			const allInitiatives = [survivor, ...absorbed].filter(
				(item): item is NonNullable<typeof item> => Boolean(item),
			);
			if (
				allInitiatives.some(
					(item) =>
						item.projectId !== project.id ||
						item.state !== "signal" ||
						item.mergedIntoInitiativeId,
				)
			) {
				throw new Error(
					"Only unmerged signal-state Project Initiatives can merge.",
				);
			}
			return repository.mergeInitiatives({
				survivingInitiativeId: survivor.id,
				absorbedInitiativeIds: uniqueAbsorbedIds,
				mergedByUserId: input.userId,
			});
		},
		async graduateInitiative(
			projectId: string,
			initiativeId: string,
			raw: GraduateInitiativeInput,
		) {
			const project = await repository.getProject(projectId);
			if (!project) throw new Error(`Unknown Project ID: ${projectId}`);
			const input = parseGraduateInitiativeInput(raw);
			const member = await repository.getTeamMember(
				project.teamId,
				input.userId,
			);
			if (!member) {
				throw new Error("An Initiative graduate must belong to the Team.");
			}
			const initiative = await repository.getInitiative(initiativeId);
			if (!initiative)
				throw new Error(`Unknown Initiative ID: ${initiativeId}`);
			if (initiative.projectId !== project.id) {
				throw new Error("Initiative must belong to the Project.");
			}
			if (initiative.state !== "signal" || initiative.mergedIntoInitiativeId) {
				throw new Error(
					"Only unmerged signal-state Initiatives can be graduated.",
				);
			}
			const graduated = await repository.graduateInitiative(
				initiative.id,
				project.id,
				input.userId,
			);
			if (!graduated) {
				throw new Error("Initiative changed while it was being graduated.");
			}
			return graduated;
		},
		async startNextInitiative(
			projectId: string,
			raw: StartNextInitiativeInput,
		) {
			const project = await repository.getProject(projectId);
			if (!project) throw new Error(`Unknown Project ID: ${projectId}`);
			const input = parseStartNextInitiativeInput(raw);
			const member = await repository.getTeamMember(
				project.teamId,
				input.userId,
			);
			if (!member) {
				throw new Error("An Initiative starter must belong to the Team.");
			}
			const started = await repository.startNextInitiative(
				project.id,
				input.userId,
			);
			if (!started) throw new Error("There is no queued Initiative to start.");
			return started;
		},
		async completeInitiative(
			projectId: string,
			initiativeId: string,
			raw: CompleteInitiativeInput,
		) {
			const project = await repository.getProject(projectId);
			if (!project) throw new Error(`Unknown Project ID: ${projectId}`);
			const input = parseCompleteInitiativeInput(raw);
			const member = await repository.getTeamMember(
				project.teamId,
				input.userId,
			);
			if (!member) {
				throw new Error("An Initiative completer must belong to the Team.");
			}
			const initiative = await repository.getInitiative(initiativeId);
			if (!initiative)
				throw new Error(`Unknown Initiative ID: ${initiativeId}`);
			if (initiative.projectId !== project.id) {
				throw new Error("Initiative must belong to the Project.");
			}
			if (initiative.state !== "executing") {
				throw new Error("Only executing Initiatives can be completed.");
			}
			const completed = await repository.completeInitiative(
				initiative.id,
				input.userId,
				input.outcomeSummary,
			);
			if (!completed) {
				throw new Error("Initiative changed while it was being completed.");
			}
			return completed;
		},
		async listNoOpSyntheses(projectId: string, options?: { limit?: number }) {
			const project = await repository.getProject(projectId);
			if (!project) throw new Error(`Unknown Project ID: ${projectId}`);
			return repository.listNoOpSyntheses(project.id, options);
		},
		async listWorkshopInitiatives(
			projectId: string,
			options?: { limit?: number },
		) {
			const project = await repository.getProject(projectId);
			if (!project) throw new Error(`Unknown Project ID: ${projectId}`);
			return repository.listWorkshopInitiatives(project.id, options);
		},
		async listInitiativeQueue(projectId: string, options?: { limit?: number }) {
			const project = await repository.getProject(projectId);
			if (!project) throw new Error(`Unknown Project ID: ${projectId}`);
			return repository.listInitiativeQueue(project.id, options);
		},
		async getProjectWorkspace(projectId: string) {
			const project = await repository.getProject(projectId);
			if (!project) throw new Error(`Unknown Project ID: ${projectId}`);
			const [noiseCount, workshopCount, queueCount, outcomeCount] =
				await Promise.all([
					repository.countNoise(project.id),
					repository.countWorkshopInitiatives(project.id),
					repository.countInitiativeQueue(project.id),
					repository.countOutcomes(project.id),
				]);
			return {
				projectId: project.id,
				noiseCount,
				workshopCount,
				queueCount,
				outcomeCount,
			};
		},
	};
}
