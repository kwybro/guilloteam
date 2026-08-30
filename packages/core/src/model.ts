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

export interface TeamInput {
	name: string;
	ownerId: string;
}

export interface JoinTeamInput {
	userId: string;
}

export interface ProjectInput {
	name: string;
	userId: string;
}

export interface TeamCreate {
	name: string;
	ownerId: string;
}

export interface ProjectCreate {
	teamId: string;
	name: string;
	createdByUserId: string;
}

export interface NoiseInput {
	content: string;
	source: string;
	userId: string;
	metadata?: Record<string, unknown>;
}

export interface NoiseCreate {
	projectId: string;
	content: string;
	source: string;
	capturedByUserId: string;
	metadata: Record<string, unknown>;
}

export interface SynthesizeNoiseInput {
	statement: string;
	noiseIds: string[];
	userId: string;
}

export interface InitiativeCreate {
	projectId: string;
	statement: string;
	noiseIds: string[];
}

export interface AttachInitiativeNoiseInput {
	noiseIds: string[];
	userId: string;
}

export interface NoOpSynthesisInput {
	noiseIds: string[];
	rationale: string;
	userId: string;
}

export interface NoOpSynthesisCreate {
	projectId: string;
	noiseIds: string[];
	rationale: string;
	requestedByUserId: string;
}

export interface UpdateInitiativeInput {
	statement: string;
	userId: string;
}

export interface MergeInitiativesInput {
	absorbedInitiativeIds: string[];
	userId: string;
}

export interface InitiativeMergeCreate {
	survivingInitiativeId: string;
	absorbedInitiativeIds: string[];
	mergedByUserId: string;
}

export interface GraduateInitiativeInput {
	userId: string;
}

export interface StartNextInitiativeInput {
	userId: string;
}

export interface CompleteInitiativeInput {
	userId: string;
	outcomeSummary: string;
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

function inputMetadata(value: unknown) {
	if (value === undefined) return {};
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error("metadata must be an object.");
	}
	return value as Record<string, unknown>;
}

function inputIds(value: unknown) {
	if (!Array.isArray(value)) throw new Error("inputIds must be an array.");
	return value.map((id) => inputText(id, "inputIds"));
}

function inputNoiseIds(value: unknown) {
	if (!Array.isArray(value)) throw new Error("noiseIds must be an array.");
	if (!value.length)
		throw new Error("noiseIds must contain at least one Noise ID.");
	return value.map((id) => inputText(id, "noiseIds"));
}

function inputInitiativeIds(value: unknown) {
	if (!Array.isArray(value)) {
		throw new Error("absorbedInitiativeIds must be an array.");
	}
	if (!value.length) {
		throw new Error(
			"absorbedInitiativeIds must contain at least one Initiative ID.",
		);
	}
	return value.map((id) => inputText(id, "absorbedInitiativeIds"));
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

export function parseTeamInput(raw: unknown): TeamInput {
	const input = inputRecord(raw);
	return {
		name: inputText(input.name, "name"),
		ownerId: inputText(input.ownerId, "ownerId"),
	};
}

export function parseJoinTeamInput(raw: unknown): JoinTeamInput {
	return { userId: inputText(inputRecord(raw).userId, "userId") };
}

export function parseProjectInput(raw: unknown): ProjectInput {
	const input = inputRecord(raw);
	return {
		name: inputText(input.name, "name"),
		userId: inputText(input.userId, "userId"),
	};
}

export function parseNoiseInput(raw: unknown): NoiseInput {
	const input = inputRecord(raw);
	return {
		content: inputText(input.content, "content"),
		source: inputText(input.source, "source"),
		userId: inputText(input.userId, "userId"),
		metadata: inputMetadata(input.metadata),
	};
}

export function parseSynthesizeNoiseInput(raw: unknown): SynthesizeNoiseInput {
	const input = inputRecord(raw);
	return {
		statement: inputText(input.statement, "statement"),
		noiseIds: inputNoiseIds(input.noiseIds),
		userId: inputText(input.userId, "userId"),
	};
}

export function parseAttachInitiativeNoiseInput(
	raw: unknown,
): AttachInitiativeNoiseInput {
	const input = inputRecord(raw);
	return {
		noiseIds: inputNoiseIds(input.noiseIds),
		userId: inputText(input.userId, "userId"),
	};
}

export function parseNoOpSynthesisInput(raw: unknown): NoOpSynthesisInput {
	const input = inputRecord(raw);
	return {
		noiseIds: inputNoiseIds(input.noiseIds),
		rationale: inputText(input.rationale, "rationale"),
		userId: inputText(input.userId, "userId"),
	};
}

export function parseUpdateInitiativeInput(
	raw: unknown,
): UpdateInitiativeInput {
	const input = inputRecord(raw);
	return {
		statement: inputText(input.statement, "statement"),
		userId: inputText(input.userId, "userId"),
	};
}

export function parseMergeInitiativesInput(
	raw: unknown,
): MergeInitiativesInput {
	const input = inputRecord(raw);
	return {
		absorbedInitiativeIds: inputInitiativeIds(input.absorbedInitiativeIds),
		userId: inputText(input.userId, "userId"),
	};
}

export function parseGraduateInitiativeInput(
	raw: unknown,
): GraduateInitiativeInput {
	return { userId: inputText(inputRecord(raw).userId, "userId") };
}

export function parseStartNextInitiativeInput(
	raw: unknown,
): StartNextInitiativeInput {
	return { userId: inputText(inputRecord(raw).userId, "userId") };
}

export function parseCompleteInitiativeInput(
	raw: unknown,
): CompleteInitiativeInput {
	const input = inputRecord(raw);
	return {
		userId: inputText(input.userId, "userId"),
		outcomeSummary: inputText(input.outcomeSummary, "outcomeSummary"),
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

export interface Team {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
}

export type TeamMemberRole = "owner" | "member";

export interface TeamMember {
	teamId: string;
	userId: string;
	role: TeamMemberRole;
	createdAt: string;
}

export interface Project {
	id: string;
	teamId: string;
	name: string;
	createdByUserId: string;
	createdAt: string;
	updatedAt: string;
}

export interface ProjectWorkspace {
	projectId: string;
	noiseCount: number;
	workshopCount: number;
	queueCount: number;
	outcomeCount: number;
}

export interface Noise {
	id: string;
	projectId: string;
	content: string;
	source: string;
	capturedByUserId: string;
	metadata: Record<string, unknown>;
	createdAt: string;
}

export type InitiativeState = "signal" | "queued" | "executing" | "completed";

export interface Initiative {
	id: string;
	projectId: string;
	statement: string;
	state: InitiativeState;
	noiseIds: string[];
	createdAt: string;
	updatedAt: string;
	mergedIntoInitiativeId?: string;
	startedAt?: string;
	startedByUserId?: string;
	completedAt?: string;
	completedByUserId?: string;
	outcomeSummary?: string;
}

export interface InitiativeQueueEntry {
	initiativeId: string;
	projectId: string;
	position: number;
	queuedByUserId: string;
	queuedAt: string;
}

export interface NoOpSynthesis {
	id: string;
	projectId: string;
	rationale: string;
	requestedByUserId: string;
	noiseIds: string[];
	createdAt: string;
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

export interface TeamProjectRepository {
	createTeam(input: TeamCreate): Promise<Team>;
	getTeam(id: string): Promise<Team | undefined>;
	joinTeam(teamId: string, userId: string): Promise<TeamMember>;
	getTeamMember(
		teamId: string,
		userId: string,
	): Promise<TeamMember | undefined>;
	createProject(input: ProjectCreate): Promise<Project>;
	getProject(id: string): Promise<Project | undefined>;
}

export interface ProjectNoiseRepository {
	createNoise(input: NoiseCreate): Promise<Noise>;
	getNoise(ids: string[]): Promise<Noise[]>;
	listNoise(projectId: string, options?: { limit?: number }): Promise<Noise[]>;
	countNoise(projectId: string): Promise<number>;
}

export interface ProjectInitiativeRepository {
	createInitiative(input: InitiativeCreate): Promise<Initiative>;
	getInitiative(id: string): Promise<Initiative | undefined>;
	attachNoise(initiativeId: string, noiseIds: string[]): Promise<Initiative>;
	updateInitiative(
		id: string,
		statement: string,
	): Promise<Initiative | undefined>;
	mergeInitiatives(input: InitiativeMergeCreate): Promise<Initiative>;
	graduateInitiative(
		initiativeId: string,
		projectId: string,
		queuedByUserId: string,
	): Promise<Initiative | undefined>;
	startNextInitiative(
		projectId: string,
		startedByUserId: string,
	): Promise<Initiative | undefined>;
	completeInitiative(
		initiativeId: string,
		completedByUserId: string,
		outcomeSummary: string,
	): Promise<Initiative | undefined>;
	listWorkshopInitiatives(
		projectId: string,
		options?: { limit?: number },
	): Promise<Initiative[]>;
	countWorkshopInitiatives(projectId: string): Promise<number>;
	listInitiativeQueue(
		projectId: string,
		options?: { limit?: number },
	): Promise<InitiativeQueueEntry[]>;
	countInitiativeQueue(projectId: string): Promise<number>;
	countOutcomes(projectId: string): Promise<number>;
}

export interface ProjectNoOpSynthesisRepository {
	createNoOpSynthesis(input: NoOpSynthesisCreate): Promise<NoOpSynthesis>;
	listNoOpSyntheses(
		projectId: string,
		options?: { limit?: number },
	): Promise<NoOpSynthesis[]>;
}
