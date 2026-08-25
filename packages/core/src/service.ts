import type {
	CompleteQueueItemInput,
	EvidenceInput,
	InputInput,
	InputUpdate,
	LearningRepository,
	ObservationInput,
	QueueInput,
	QueueItemInput,
	QueueItemReadiness,
	QueueItemUpdate,
	QueueRepository,
	QueueUpdate,
} from "./model";
import {
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
