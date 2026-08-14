import {
	index,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const confidence = pgEnum("evidence_confidence", [
	"low",
	"medium",
	"high",
]);

export const observations = pgTable(
	"observations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		type: text("type").notNull(),
		content: text("content").notNull(),
		source: text("source"),
		actorId: text("actor_id"),
		metadata: jsonb("metadata")
			.$type<Record<string, unknown>>()
			.notNull()
			.default({}),
		observedAt: timestamp("observed_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [index("observations_observed_at_idx").on(table.observedAt)],
);

export const evidence = pgTable("evidence", {
	id: uuid("id").primaryKey().defaultRandom(),
	title: text("title").notNull(),
	claim: text("claim").notNull(),
	confidence: confidence("confidence").notNull(),
	rationale: text("rationale"),
	intentReferences: jsonb("intent_references")
		.$type<string[]>()
		.notNull()
		.default([]),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const evidenceObservations = pgTable(
	"evidence_observations",
	{
		evidenceId: uuid("evidence_id")
			.notNull()
			.references(() => evidence.id, { onDelete: "cascade" }),
		observationId: uuid("observation_id")
			.notNull()
			.references(() => observations.id, { onDelete: "restrict" }),
	},
	(table) => [
		primaryKey({ columns: [table.evidenceId, table.observationId] }),
		index("evidence_observations_observation_idx").on(table.observationId),
	],
);
