import {
	foreignKey,
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

export const teamMemberRole = pgEnum("team_member_role", ["owner", "member"]);

export const initiativeState = pgEnum("initiative_state", [
	"signal",
	"queued",
	"executing",
	"completed",
]);

export const teams = pgTable(
	"teams",
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
	(table) => [index("teams_created_at_idx").on(table.createdAt)],
);

export const teamMembers = pgTable(
	"team_members",
	{
		teamId: uuid("team_id")
			.notNull()
			.references(() => teams.id, { onDelete: "cascade" }),
		userId: text("user_id").notNull(),
		role: teamMemberRole("role").notNull().default("member"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		primaryKey({ columns: [table.teamId, table.userId] }),
		index("team_members_user_idx").on(table.userId),
	],
);

export const projects = pgTable(
	"projects",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => teams.id, { onDelete: "restrict" }),
		name: text("name").notNull(),
		createdByUserId: text("created_by_user_id").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("projects_team_created_at_idx").on(table.teamId, table.createdAt),
	],
);

export const workspaceFocuses = pgTable(
	"workspace_focuses",
	{
		userId: text("user_id").primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => teams.id, { onDelete: "cascade" }),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [index("workspace_focuses_project_idx").on(table.projectId)],
);

export const noise = pgTable(
	"noise",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		source: text("source").notNull(),
		capturedByUserId: text("captured_by_user_id").notNull(),
		metadata: jsonb("metadata")
			.$type<Record<string, unknown>>()
			.notNull()
			.default({}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("noise_project_created_at_idx").on(table.projectId, table.createdAt),
	],
);

export const initiatives = pgTable(
	"initiatives",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		statement: text("statement").notNull(),
		state: initiativeState("state").notNull().default("signal"),
		mergedIntoInitiativeId: uuid("merged_into_initiative_id"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		startedAt: timestamp("started_at", { withTimezone: true }),
		startedByUserId: text("started_by_user_id"),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		completedByUserId: text("completed_by_user_id"),
		outcomeSummary: text("outcome_summary"),
	},
	(table) => [
		foreignKey({
			columns: [table.mergedIntoInitiativeId],
			foreignColumns: [table.id],
		}).onDelete("restrict"),
		index("initiatives_project_state_created_at_idx").on(
			table.projectId,
			table.state,
			table.createdAt,
		),
	],
);

export const initiativeMerges = pgTable(
	"initiative_merges",
	{
		survivingInitiativeId: uuid("surviving_initiative_id")
			.notNull()
			.references(() => initiatives.id, { onDelete: "restrict" }),
		absorbedInitiativeId: uuid("absorbed_initiative_id")
			.notNull()
			.references(() => initiatives.id, { onDelete: "restrict" }),
		mergedByUserId: text("merged_by_user_id").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		primaryKey({ columns: [table.absorbedInitiativeId] }),
		index("initiative_merges_survivor_idx").on(table.survivingInitiativeId),
	],
);

export const initiativeQueue = pgTable(
	"initiative_queue",
	{
		initiativeId: uuid("initiative_id")
			.primaryKey()
			.references(() => initiatives.id, { onDelete: "restrict" }),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		position: integer("position").notNull(),
		queuedByUserId: text("queued_by_user_id").notNull(),
		queuedAt: timestamp("queued_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("initiative_queue_project_position_idx").on(
			table.projectId,
			table.position,
		),
	],
);

export const initiativeNoise = pgTable(
	"initiative_noise",
	{
		initiativeId: uuid("initiative_id")
			.notNull()
			.references(() => initiatives.id, { onDelete: "cascade" }),
		noiseId: uuid("noise_id")
			.notNull()
			.references(() => noise.id, { onDelete: "restrict" }),
		position: integer("position").notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.initiativeId, table.noiseId] }),
		index("initiative_noise_initiative_position_idx").on(
			table.initiativeId,
			table.position,
		),
		index("initiative_noise_noise_idx").on(table.noiseId),
	],
);

export const noOpSyntheses = pgTable(
	"no_op_syntheses",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		rationale: text("rationale").notNull(),
		requestedByUserId: text("requested_by_user_id").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("no_op_syntheses_project_created_at_idx").on(
			table.projectId,
			table.createdAt,
		),
	],
);

export const noOpSynthesisNoise = pgTable(
	"no_op_synthesis_noise",
	{
		noOpSynthesisId: uuid("no_op_synthesis_id")
			.notNull()
			.references(() => noOpSyntheses.id, { onDelete: "cascade" }),
		noiseId: uuid("noise_id")
			.notNull()
			.references(() => noise.id, { onDelete: "restrict" }),
		position: integer("position").notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.noOpSynthesisId, table.noiseId] }),
		index("no_op_synthesis_noise_position_idx").on(
			table.noOpSynthesisId,
			table.position,
		),
		index("no_op_synthesis_noise_noise_idx").on(table.noiseId),
	],
);

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
