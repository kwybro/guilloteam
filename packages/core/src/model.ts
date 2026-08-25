import { z } from "zod";

const requiredText = z.string().trim().min(1);

export const observationInputSchema = z.object({
	type: requiredText,
	content: requiredText,
	source: requiredText.optional(),
	actorId: requiredText.optional(),
	metadata: z.record(z.string(), z.unknown()).default({}),
	observedAt: z.string().datetime().optional(),
});

export const evidenceInputSchema = z.object({
	title: requiredText,
	claim: requiredText,
	confidence: z.enum(["low", "medium", "high"]),
	rationale: requiredText.optional(),
	observationIds: z.array(z.string().min(1)).min(1),
	intentReferences: z.array(z.string().min(1)).default([]),
	createdBy: requiredText.optional(),
});

export interface ObservationInput {
	type: string;
	content: string;
	source?: string;
	actorId?: string;
	metadata?: Record<string, unknown>;
	observedAt?: string;
}

export interface EvidenceInput {
	title: string;
	claim: string;
	confidence: "low" | "medium" | "high";
	rationale?: string;
	observationIds: string[];
	intentReferences?: string[];
	createdBy?: string;
}

export interface InputInput {
	name: string;
	description: string;
}

export interface InputUpdate {
	name?: string;
	description?: string;
}

export interface QueueInput {
	name: string;
}

export type QueueUpdate = QueueInput;

export interface QueueItemInput {
	queueId: string;
	name: string;
	description: string;
	inputIds?: string[];
	position?: number;
}

export interface QueueItemCreate {
	queueId: string;
	name: string;
	description: string;
	inputIds: string[];
	position?: number;
}

export interface QueueItemUpdate {
	name?: string;
	description?: string;
	inputIds?: string[];
}

export type QueueItemReadiness = "not_ready" | "ready";
export type QueueItemStatus = "queued" | "in_progress" | "done";

export interface CompleteQueueItemInput {
	completionSummary?: string;
}

function inputRecord(raw: unknown) {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
		throw new Error("Expected an object.");
	}
	return raw as Record<string, unknown>;
}

function inputText(value: unknown, field: string) {
	if (typeof value !== "string" || !value.trim()) {
		throw new Error(`${field} is required.`);
	}
	return value.trim();
}

function optionalInputText(value: unknown, field: string) {
	return value === undefined ? undefined : inputText(value, field);
}

function inputIds(value: unknown) {
	if (!Array.isArray(value)) throw new Error("inputIds must be an array.");
	return value.map((id) => inputText(id, "inputIds"));
}

function inputPosition(value: unknown) {
	if (!Number.isInteger(value) || typeof value !== "number" || value < 1) {
		throw new Error("position must be a positive integer.");
	}
	return value;
}

export function parseInputInput(raw: unknown): InputInput {
	const input = inputRecord(raw);
	return {
		name: inputText(input.name, "name"),
		description: inputText(input.description, "description"),
	};
}

export function parseInputUpdate(raw: unknown): InputUpdate {
	const input = inputRecord(raw);
	const update = {
		name: optionalInputText(input.name, "name"),
		description: optionalInputText(input.description, "description"),
	};
	if (update.name === undefined && update.description === undefined) {
		throw new Error("An Input update requires a name or description.");
	}
	return update;
}

export function parseQueueInput(raw: unknown): QueueInput {
	return { name: inputText(inputRecord(raw).name, "name") };
}

export function parseQueueItemInput(raw: unknown): QueueItemCreate {
	const input = inputRecord(raw);
	return {
		queueId: inputText(input.queueId, "queueId"),
		name: inputText(input.name, "name"),
		description: inputText(input.description, "description"),
		inputIds: input.inputIds === undefined ? [] : inputIds(input.inputIds),
		position:
			input.position === undefined ? undefined : inputPosition(input.position),
	};
}

export function parseQueueItemUpdate(raw: unknown): QueueItemUpdate {
	const input = inputRecord(raw);
	const update = {
		name: optionalInputText(input.name, "name"),
		description: optionalInputText(input.description, "description"),
		inputIds:
			input.inputIds === undefined ? undefined : inputIds(input.inputIds),
	};
	if (
		update.name === undefined &&
		update.description === undefined &&
		update.inputIds === undefined
	) {
		throw new Error("A Queue Item update requires a changed field.");
	}
	return update;
}

export function parseMoveQueueItemInput(raw: unknown) {
	return { position: inputPosition(inputRecord(raw).position) };
}

export function parseQueueItemReadiness(raw: unknown): QueueItemReadiness {
	if (raw === "not_ready" || raw === "ready") return raw;
	throw new Error("readiness must be not_ready or ready.");
}

export function parseCompleteQueueItemInput(
	raw: unknown,
): CompleteQueueItemInput {
	const input = inputRecord(raw);
	return {
		completionSummary: optionalInputText(
			input.completionSummary,
			"completionSummary",
		),
	};
}

export interface Observation {
	id: string;
	type: string;
	content: string;
	source?: string;
	actorId?: string;
	metadata: Record<string, unknown>;
	observedAt: string;
	createdAt: string;
	synthesized: boolean;
}

export interface Evidence {
	id: string;
	title: string;
	claim: string;
	confidence: "low" | "medium" | "high";
	rationale?: string;
	observationIds: string[];
	intentReferences: string[];
	createdBy?: string;
	createdAt: string;
}

export interface Intent {
	constitution: string;
	worldModel: string;
}

export interface Input {
	id: string;
	name: string;
	description: string;
	createdAt: string;
	updatedAt: string;
}

export interface Queue {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
}

export interface QueueItem {
	id: string;
	queueId: string;
	name: string;
	description: string;
	position: number;
	readiness: QueueItemReadiness;
	status: QueueItemStatus;
	inputIds: string[];
	createdAt: string;
	updatedAt: string;
	startedAt?: string;
	completedAt?: string;
	completionSummary?: string;
}

export interface LearningRepository {
	createObservation(input: ObservationInput): Promise<Observation>;
	listObservations(options?: {
		unsynthesizedOnly?: boolean;
		limit?: number;
	}): Promise<Observation[]>;
	getObservations(ids: string[]): Promise<Observation[]>;
	createEvidence(input: EvidenceInput): Promise<Evidence>;
	listEvidence(options?: { limit?: number }): Promise<Evidence[]>;
}

export interface QueueRepository {
	createInput(input: InputInput): Promise<Input>;
	listInputs(options?: {
		unlinkedOnly?: boolean;
		limit?: number;
	}): Promise<Input[]>;
	getInputs(ids: string[]): Promise<Input[]>;
	updateInput(id: string, input: InputUpdate): Promise<Input | undefined>;
	createQueue(input: QueueInput): Promise<Queue>;
	listQueues(options?: { limit?: number }): Promise<Queue[]>;
	getQueue(id: string): Promise<Queue | undefined>;
	updateQueue(id: string, input: QueueUpdate): Promise<Queue | undefined>;
	createQueueItem(input: QueueItemCreate): Promise<QueueItem>;
	getQueueItem(id: string): Promise<QueueItem | undefined>;
	listQueueItems(options: {
		queueId: string;
		includeDone?: boolean;
		limit?: number;
	}): Promise<QueueItem[]>;
	updateQueueItem(
		id: string,
		input: QueueItemUpdate,
	): Promise<QueueItem | undefined>;
	moveQueueItem(id: string, position: number): Promise<QueueItem | undefined>;
	setQueueItemReadiness(
		id: string,
		readiness: QueueItemReadiness,
	): Promise<QueueItem | undefined>;
	getNextQueueItem(
		queueId: string,
		readiness: QueueItemReadiness,
	): Promise<QueueItem | undefined>;
	startQueueItem(id: string): Promise<QueueItem | undefined>;
	completeQueueItem(
		id: string,
		input: CompleteQueueItemInput,
	): Promise<QueueItem | undefined>;
}
