import type {
	Evidence,
	EvidenceInput,
	LearningRepository,
	Observation,
	ObservationInput,
} from "@guilloteam/core";
import {
	desc,
	eq,
	getTableColumns,
	inArray,
	notExists,
	sql,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { evidence, evidenceObservations, observations } from "./schema";

export function createPostgresLearningStore(connectionString: string) {
	const client = postgres(connectionString, { max: 10 });
	const db = drizzle({ client });
	const observationColumns = getTableColumns(observations);

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

	const repository: LearningRepository & {
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
		close: () => client.end(),
		migrate: () =>
			migrate(db, {
				migrationsFolder: new URL("../drizzle", import.meta.url).pathname,
			}),
	};
	return repository;
}

export * from "./schema";
