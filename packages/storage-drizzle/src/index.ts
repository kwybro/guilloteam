import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
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
import { drizzle } from "drizzle-orm/bun-sqlite";
import { evidence, evidenceObservations, observations } from "./schema";

export function createDrizzleLearningStore(
	filename: string,
): LearningRepository & { close(): void } {
	if (filename !== ":memory:")
		mkdirSync(dirname(filename), { recursive: true });
	const sqlite = new Database(filename, { create: true });
	sqlite.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
	sqlite.exec(`
    CREATE TABLE IF NOT EXISTS observations (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, content TEXT NOT NULL, source TEXT,
      actor_id TEXT, metadata TEXT NOT NULL, observed_at TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS observations_observed_at_idx ON observations(observed_at);
    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, claim TEXT NOT NULL,
      confidence TEXT NOT NULL CHECK(confidence IN ('low','medium','high')),
      rationale TEXT, intent_references TEXT NOT NULL, created_by TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS evidence_observations (
      evidence_id TEXT NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
      observation_id TEXT NOT NULL REFERENCES observations(id) ON DELETE RESTRICT,
      PRIMARY KEY(evidence_id, observation_id)
    );
    CREATE INDEX IF NOT EXISTS evidence_observations_observation_idx
      ON evidence_observations(observation_id);
  `);
	const db = drizzle({ client: sqlite });
	const observationColumns = getTableColumns(observations);

	const mapObservation = (
		row: typeof observations.$inferSelect & { synthesized: boolean | number },
	): Observation => ({
		...row,
		source: row.source ?? undefined,
		actorId: row.actorId ?? undefined,
		synthesized: Boolean(row.synthesized),
	});

	const repository: LearningRepository & { close(): void } = {
		async createObservation(input: ObservationInput) {
			const now = new Date().toISOString();
			const row = {
				id: randomUUID(),
				type: input.type,
				content: input.content,
				source: input.source ?? null,
				actorId: input.actorId ?? null,
				metadata: input.metadata ?? {},
				observedAt: input.observedAt ?? now,
				createdAt: now,
			};
			db.insert(observations).values(row).run();
			return mapObservation({ ...row, synthesized: false });
		},
		async listObservations(options = {}) {
			const synthesized = sql<number>`exists(
        select 1 from evidence_observations eo where eo.observation_id = ${observations.id}
      )`.as("synthesized");
			const query = db
				.select({ ...observationColumns, synthesized })
				.from(observations)
				.orderBy(desc(observations.observedAt))
				.limit(options.limit ?? 100);
			const rows = options.unsynthesizedOnly
				? query
						.where(
							notExists(
								db
									.select({ value: sql`1` })
									.from(evidenceObservations)
									.where(
										eq(evidenceObservations.observationId, observations.id),
									),
							),
						)
						.all()
				: query.all();
			return rows.map(mapObservation);
		},
		async getObservations(ids: string[]) {
			if (!ids.length) return [];
			const rows = db
				.select({ ...observationColumns, synthesized: sql<number>`0` })
				.from(observations)
				.where(inArray(observations.id, ids))
				.all();
			return rows.map(mapObservation);
		},
		async createEvidence(input: EvidenceInput) {
			const row = {
				id: randomUUID(),
				title: input.title,
				claim: input.claim,
				confidence: input.confidence,
				rationale: input.rationale ?? null,
				intentReferences: input.intentReferences ?? [],
				createdBy: input.createdBy ?? null,
				createdAt: new Date().toISOString(),
			};
			sqlite.transaction(() => {
				db.insert(evidence).values(row).run();
				db.insert(evidenceObservations)
					.values(
						input.observationIds.map((observationId) => ({
							evidenceId: row.id,
							observationId,
						})),
					)
					.run();
			})();
			return {
				...row,
				rationale: row.rationale ?? undefined,
				createdBy: row.createdBy ?? undefined,
				observationIds: input.observationIds,
			};
		},
		async listEvidence(options = {}) {
			const rows = db
				.select()
				.from(evidence)
				.orderBy(desc(evidence.createdAt))
				.limit(options.limit ?? 100)
				.all();
			return rows.map(
				(row): Evidence => ({
					...row,
					rationale: row.rationale ?? undefined,
					createdBy: row.createdBy ?? undefined,
					observationIds: db
						.select({ id: evidenceObservations.observationId })
						.from(evidenceObservations)
						.where(eq(evidenceObservations.evidenceId, row.id))
						.all()
						.map((item) => item.id),
				}),
			);
		},
		close: () => sqlite.close(),
	};
	return repository;
}

export * from "./schema";
