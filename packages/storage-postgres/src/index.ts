import type {
	CompleteQueueItemInput,
	Evidence,
	EvidenceInput,
	Input,
	InputInput,
	InputUpdate,
	LearningRepository,
	Observation,
	ObservationInput,
	Queue,
	QueueInput,
	QueueItem,
	QueueItemCreate,
	QueueItemReadiness,
	QueueItemUpdate,
	QueueRepository,
	QueueUpdate,
} from "@guilloteam/core";
import {
	and,
	asc,
	desc,
	eq,
	getTableColumns,
	gt,
	gte,
	inArray,
	lt,
	lte,
	ne,
	notExists,
	sql,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import {
	evidence,
	evidenceObservations,
	inputs,
	observations,
	queueItemInputs,
	queueItems,
	queues,
} from "./schema";

export function createPostgresLearningStore(connectionString: string) {
	const client = postgres(connectionString, { max: 10 });
	const db = drizzle({ client });
	const observationColumns = getTableColumns(observations);
	const inputColumns = getTableColumns(inputs);
	const queueColumns = getTableColumns(queues);
	const queueItemColumns = getTableColumns(queueItems);

	const mapObservation = (
		row: typeof observations.$inferSelect & { synthesized: boolean },
	): Observation => ({
		...row,
		source: row.source ?? undefined,
		actorId: row.actorId ?? undefined,
		observedAt: row.observedAt.toISOString(),
		createdAt: row.createdAt.toISOString(),
		synthesized: row.synthesized,
	});

	const mapInput = (row: typeof inputs.$inferSelect): Input => ({
		...row,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	});

	const mapQueue = (row: typeof queues.$inferSelect): Queue => ({
		...row,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	});

	const mapQueueItem = (
		row: typeof queueItems.$inferSelect,
		inputIds: string[],
	): QueueItem => ({
		...row,
		readiness: row.readiness as QueueItemReadiness,
		status: row.status as QueueItem["status"],
		inputIds,
		startedAt: row.startedAt?.toISOString(),
		completedAt: row.completedAt?.toISOString(),
		completionSummary: row.completionSummary ?? undefined,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	});

	const getQueueItemInputIds = async (queueItemId: string) =>
		(
			await db
				.select({ inputId: queueItemInputs.inputId })
				.from(queueItemInputs)
				.where(eq(queueItemInputs.queueItemId, queueItemId))
		).map((item) => item.inputId);

	const mapStoredQueueItem = async (row: typeof queueItems.$inferSelect) =>
		mapQueueItem(row, await getQueueItemInputIds(row.id));

	const activeQueueItem = (queueId: string) =>
		and(eq(queueItems.queueId, queueId), ne(queueItems.status, "done"));

	const repository: LearningRepository &
		QueueRepository & {
			close(): Promise<void>;
			migrate(): Promise<void>;
		} = {
		async createObservation(input: ObservationInput) {
			const [row] = await db
				.insert(observations)
				.values({
					type: input.type,
					content: input.content,
					source: input.source,
					actorId: input.actorId,
					metadata: input.metadata ?? {},
					observedAt: input.observedAt ? new Date(input.observedAt) : undefined,
				})
				.returning();
			if (!row) throw new Error("Failed to create Observation.");
			return mapObservation({ ...row, synthesized: false });
		},
		async listObservations(options = {}) {
			const synthesized = sql<boolean>`exists(
				select 1 from ${evidenceObservations}
				where ${evidenceObservations.observationId} = ${observations.id}
			)`.as("synthesized");
			const query = db
				.select({ ...observationColumns, synthesized })
				.from(observations)
				.orderBy(desc(observations.observedAt))
				.limit(options.limit ?? 100);
			const rows = options.unsynthesizedOnly
				? await query.where(
						notExists(
							db
								.select({ value: sql`1` })
								.from(evidenceObservations)
								.where(eq(evidenceObservations.observationId, observations.id)),
						),
					)
				: await query;
			return rows.map(mapObservation);
		},
		async getObservations(ids: string[]) {
			if (!ids.length) return [];
			const rows = await db
				.select({
					...observationColumns,
					synthesized: sql<boolean>`false`,
				})
				.from(observations)
				.where(inArray(observations.id, ids));
			return rows.map(mapObservation);
		},
		async createEvidence(input: EvidenceInput) {
			return db.transaction(async (tx) => {
				const [row] = await tx
					.insert(evidence)
					.values({
						title: input.title,
						claim: input.claim,
						confidence: input.confidence,
						rationale: input.rationale,
						intentReferences: input.intentReferences ?? [],
						createdBy: input.createdBy,
					})
					.returning();
				if (!row) throw new Error("Failed to create Evidence.");
				await tx.insert(evidenceObservations).values(
					input.observationIds.map((observationId) => ({
						evidenceId: row.id,
						observationId,
					})),
				);
				return {
					...row,
					rationale: row.rationale ?? undefined,
					createdBy: row.createdBy ?? undefined,
					createdAt: row.createdAt.toISOString(),
					observationIds: input.observationIds,
				};
			});
		},
		async listEvidence(options = {}) {
			const rows = await db
				.select()
				.from(evidence)
				.orderBy(desc(evidence.createdAt))
				.limit(options.limit ?? 100);
			return Promise.all(
				rows.map(
					async (row): Promise<Evidence> => ({
						...row,
						rationale: row.rationale ?? undefined,
						createdBy: row.createdBy ?? undefined,
						createdAt: row.createdAt.toISOString(),
						observationIds: (
							await db
								.select({ id: evidenceObservations.observationId })
								.from(evidenceObservations)
								.where(eq(evidenceObservations.evidenceId, row.id))
						).map((item) => item.id),
					}),
				),
			);
		},
		async createInput(input: InputInput) {
			const [row] = await db.insert(inputs).values(input).returning();
			if (!row) throw new Error("Failed to create Input.");
			return mapInput(row);
		},
		async listInputs(options = {}) {
			const query = db
				.select(inputColumns)
				.from(inputs)
				.orderBy(desc(inputs.createdAt))
				.limit(options.limit ?? 100);
			const rows = options.unlinkedOnly
				? await query.where(
						notExists(
							db
								.select({ value: sql`1` })
								.from(queueItemInputs)
								.where(eq(queueItemInputs.inputId, inputs.id)),
						),
					)
				: await query;
			return rows.map(mapInput);
		},
		async getInputs(ids: string[]) {
			if (!ids.length) return [];
			return (
				await db
					.select(inputColumns)
					.from(inputs)
					.where(inArray(inputs.id, ids))
			).map(mapInput);
		},
		async updateInput(id: string, input: InputUpdate) {
			const [row] = await db
				.update(inputs)
				.set({ ...input, updatedAt: new Date() })
				.where(eq(inputs.id, id))
				.returning();
			return row ? mapInput(row) : undefined;
		},
		async createQueue(input: QueueInput) {
			const [row] = await db.insert(queues).values(input).returning();
			if (!row) throw new Error("Failed to create Queue.");
			return mapQueue(row);
		},
		async listQueues(options = {}) {
			return (
				await db
					.select(queueColumns)
					.from(queues)
					.orderBy(desc(queues.createdAt))
					.limit(options.limit ?? 100)
			).map(mapQueue);
		},
		async getQueue(id: string) {
			const [row] = await db
				.select(queueColumns)
				.from(queues)
				.where(eq(queues.id, id));
			return row ? mapQueue(row) : undefined;
		},
		async updateQueue(id: string, input: QueueUpdate) {
			const [row] = await db
				.update(queues)
				.set({ ...input, updatedAt: new Date() })
				.where(eq(queues.id, id))
				.returning();
			return row ? mapQueue(row) : undefined;
		},
		async createQueueItem(input: QueueItemCreate) {
			return db.transaction(async (tx) => {
				const active = await tx
					.select({ position: queueItems.position })
					.from(queueItems)
					.where(activeQueueItem(input.queueId))
					.orderBy(desc(queueItems.position))
					.limit(1);
				const length = active[0]?.position ?? 0;
				const position = input.position ?? length + 1;
				if (position > length + 1) {
					throw new Error(
						`Queue position must be between 1 and ${length + 1}.`,
					);
				}
				if (position <= length) {
					await tx
						.update(queueItems)
						.set({
							position: sql`${queueItems.position} + 1`,
							updatedAt: new Date(),
						})
						.where(
							and(
								activeQueueItem(input.queueId),
								gte(queueItems.position, position),
							),
						);
				}
				const [row] = await tx
					.insert(queueItems)
					.values({
						queueId: input.queueId,
						name: input.name,
						description: input.description,
						position,
					})
					.returning();
				if (!row) throw new Error("Failed to create Queue Item.");
				if (input.inputIds.length) {
					await tx.insert(queueItemInputs).values(
						input.inputIds.map((inputId) => ({
							queueItemId: row.id,
							inputId,
						})),
					);
				}
				return mapQueueItem(row, input.inputIds);
			});
		},
		async getQueueItem(id: string) {
			const [row] = await db
				.select(queueItemColumns)
				.from(queueItems)
				.where(eq(queueItems.id, id));
			return row ? mapStoredQueueItem(row) : undefined;
		},
		async listQueueItems(options) {
			const condition = options.includeDone
				? eq(queueItems.queueId, options.queueId)
				: activeQueueItem(options.queueId);
			const rows = await db
				.select(queueItemColumns)
				.from(queueItems)
				.where(condition)
				.orderBy(asc(queueItems.position), asc(queueItems.createdAt))
				.limit(options.limit ?? 100);
			return Promise.all(rows.map(mapStoredQueueItem));
		},
		async updateQueueItem(id: string, input: QueueItemUpdate) {
			return db.transaction(async (tx) => {
				const [row] = await tx
					.update(queueItems)
					.set({
						name: input.name,
						description: input.description,
						updatedAt: new Date(),
					})
					.where(and(eq(queueItems.id, id), eq(queueItems.status, "queued")))
					.returning();
				if (!row) return undefined;
				if (input.inputIds !== undefined) {
					await tx
						.delete(queueItemInputs)
						.where(eq(queueItemInputs.queueItemId, id));
					if (input.inputIds.length) {
						await tx.insert(queueItemInputs).values(
							input.inputIds.map((inputId) => ({
								queueItemId: id,
								inputId,
							})),
						);
					}
				}
				return mapQueueItem(
					row,
					input.inputIds ?? (await getQueueItemInputIds(id)),
				);
			});
		},
		async moveQueueItem(id: string, position: number) {
			return db.transaction(async (tx) => {
				const [current] = await tx
					.select(queueItemColumns)
					.from(queueItems)
					.where(and(eq(queueItems.id, id), ne(queueItems.status, "done")));
				if (!current) return undefined;
				const active = await tx
					.select({ position: queueItems.position })
					.from(queueItems)
					.where(activeQueueItem(current.queueId))
					.orderBy(desc(queueItems.position))
					.limit(1);
				const length = active[0]?.position ?? 0;
				if (position > length) {
					throw new Error(`Queue position must be between 1 and ${length}.`);
				}
				if (position === current.position) {
					return mapQueueItem(current, await getQueueItemInputIds(id));
				}
				if (position < current.position) {
					await tx
						.update(queueItems)
						.set({
							position: sql`${queueItems.position} + 1`,
							updatedAt: new Date(),
						})
						.where(
							and(
								activeQueueItem(current.queueId),
								gte(queueItems.position, position),
								lt(queueItems.position, current.position),
							),
						);
				} else {
					await tx
						.update(queueItems)
						.set({
							position: sql`${queueItems.position} - 1`,
							updatedAt: new Date(),
						})
						.where(
							and(
								activeQueueItem(current.queueId),
								gt(queueItems.position, current.position),
								lte(queueItems.position, position),
							),
						);
				}
				const [row] = await tx
					.update(queueItems)
					.set({ position, updatedAt: new Date() })
					.where(and(eq(queueItems.id, id), ne(queueItems.status, "done")))
					.returning();
				return row
					? mapQueueItem(row, await getQueueItemInputIds(id))
					: undefined;
			});
		},
		async setQueueItemReadiness(id: string, readiness: QueueItemReadiness) {
			const [row] = await db
				.update(queueItems)
				.set({ readiness, updatedAt: new Date() })
				.where(and(eq(queueItems.id, id), eq(queueItems.status, "queued")))
				.returning();
			return row ? mapStoredQueueItem(row) : undefined;
		},
		async getNextQueueItem(queueId: string, readiness: QueueItemReadiness) {
			const [row] = await db
				.select(queueItemColumns)
				.from(queueItems)
				.where(
					and(
						eq(queueItems.queueId, queueId),
						eq(queueItems.status, "queued"),
						eq(queueItems.readiness, readiness),
					),
				)
				.orderBy(asc(queueItems.position))
				.limit(1);
			return row ? mapStoredQueueItem(row) : undefined;
		},
		async startQueueItem(id: string) {
			const [row] = await db
				.update(queueItems)
				.set({
					status: "in_progress",
					startedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(queueItems.id, id),
						eq(queueItems.status, "queued"),
						eq(queueItems.readiness, "ready"),
					),
				)
				.returning();
			return row ? mapStoredQueueItem(row) : undefined;
		},
		async completeQueueItem(id: string, input: CompleteQueueItemInput) {
			return db.transaction(async (tx) => {
				const [row] = await tx
					.update(queueItems)
					.set({
						status: "done",
						completedAt: new Date(),
						completionSummary: input.completionSummary,
						updatedAt: new Date(),
					})
					.where(
						and(eq(queueItems.id, id), eq(queueItems.status, "in_progress")),
					)
					.returning();
				if (!row) return undefined;
				await tx
					.update(queueItems)
					.set({
						position: sql`${queueItems.position} - 1`,
						updatedAt: new Date(),
					})
					.where(
						and(
							activeQueueItem(row.queueId),
							gt(queueItems.position, row.position),
						),
					);
				return mapQueueItem(row, await getQueueItemInputIds(id));
			});
		},
		close: () => client.end(),
		migrate: () =>
			migrate(db, {
				migrationsFolder: new URL("../drizzle", import.meta.url).pathname,
			}),
	};
	return repository;
}

export * from "./schema";
