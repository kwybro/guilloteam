import { index, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const observations = sqliteTable(
	"observations",
	{
		id: text("id").primaryKey(),
		type: text("type").notNull(),
		content: text("content").notNull(),
		source: text("source"),
		actorId: text("actor_id"),
		metadata: text("metadata", { mode: "json" })
			.$type<Record<string, unknown>>()
			.notNull(),
		observedAt: text("observed_at").notNull(),
		createdAt: text("created_at").notNull(),
	},
	(table) => [index("observations_observed_at_idx").on(table.observedAt)],
);

export const evidence = sqliteTable("evidence", {
	id: text("id").primaryKey(),
	title: text("title").notNull(),
	claim: text("claim").notNull(),
	confidence: text("confidence", { enum: ["low", "medium", "high"] }).notNull(),
	rationale: text("rationale"),
	intentReferences: text("intent_references", { mode: "json" })
		.$type<string[]>()
		.notNull(),
	createdBy: text("created_by"),
	createdAt: text("created_at").notNull(),
});

export const evidenceObservations = sqliteTable(
	"evidence_observations",
	{
		evidenceId: text("evidence_id")
			.notNull()
			.references(() => evidence.id, { onDelete: "cascade" }),
		observationId: text("observation_id")
			.notNull()
			.references(() => observations.id, { onDelete: "restrict" }),
	},
	(table) => [
		primaryKey({ columns: [table.evidenceId, table.observationId] }),
		index("evidence_observations_observation_idx").on(table.observationId),
	],
);
