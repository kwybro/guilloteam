import {
	index,
	integer,
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

export const queueItemReadiness = pgEnum("queue_item_readiness", [
	"not_ready",
	"ready",
]);

export const queueItemStatus = pgEnum("queue_item_status", [
	"queued",
	"in_progress",
	"done",
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

export const inputs = pgTable(
	"inputs",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull(),
		description: text("description").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [index("inputs_created_at_idx").on(table.createdAt)],
);

export const queues = pgTable(
	"queues",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [index("queues_created_at_idx").on(table.createdAt)],
);

export const queueItems = pgTable(
	"queue_items",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		queueId: uuid("queue_id")
			.notNull()
			.references(() => queues.id, { onDelete: "restrict" }),
		name: text("name").notNull(),
		description: text("description").notNull(),
		position: integer("position").notNull(),
		readiness: queueItemReadiness("readiness").notNull().default("not_ready"),
		status: queueItemStatus("status").notNull().default("queued"),
		startedAt: timestamp("started_at", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		completionSummary: text("completion_summary"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("queue_items_queue_position_idx").on(table.queueId, table.position),
		index("queue_items_queue_status_idx").on(
			table.queueId,
			table.status,
			table.readiness,
		),
	],
);

export const queueItemInputs = pgTable(
	"queue_item_inputs",
	{
		queueItemId: uuid("queue_item_id")
			.notNull()
			.references(() => queueItems.id, { onDelete: "cascade" }),
		inputId: uuid("input_id")
			.notNull()
			.references(() => inputs.id, { onDelete: "restrict" }),
	},
	(table) => [
		primaryKey({ columns: [table.queueItemId, table.inputId] }),
		index("queue_item_inputs_input_idx").on(table.inputId),
	],
);
