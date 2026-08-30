import type {
	CompleteQueueItemInput,
	Evidence,
	EvidenceInput,
	Initiative,
	InitiativeCreate,
	InitiativeMergeCreate,
	InitiativeQueueEntry,
	InitiativeState,
	Input,
	InputInput,
	InputUpdate,
	LearningRepository,
	Noise,
	NoiseCreate,
	NoOpSynthesis,
	NoOpSynthesisCreate,
	Observation,
	ObservationInput,
	Project,
	ProjectCreate,
	ProjectInitiativeRepository,
	ProjectNoiseRepository,
	ProjectNoOpSynthesisRepository,
	Queue,
	QueueInput,
	QueueItem,
	QueueItemCreate,
	QueueItemReadiness,
	QueueItemUpdate,
	QueueRepository,
	QueueUpdate,
	Team,
	TeamMember,
	TeamMemberRole,
	TeamProjectRepository,
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
	isNull,
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
	initiativeMerges,
	initiativeNoise,
	initiativeQueue,
	initiatives,
	inputs,
	noise,
	noOpSyntheses,
	noOpSynthesisNoise,
	observations,
	projects,
	queueItemInputs,
	queueItems,
	queues,
	teamMembers,
	teams,
} from "./schema";

export function createPostgresLearningStore(connectionString: string) {
	const client = postgres(connectionString, { max: 10 });
	const db = drizzle({ client });
	const observationColumns = getTableColumns(observations);
	const inputColumns = getTableColumns(inputs);
	const queueColumns = getTableColumns(queues);
	const queueItemColumns = getTableColumns(queueItems);
	const teamColumns = getTableColumns(teams);
	const projectColumns = getTableColumns(projects);
	const noiseColumns = getTableColumns(noise);
	const initiativeColumns = getTableColumns(initiatives);
	const initiativeQueueColumns = getTableColumns(initiativeQueue);
	const noOpSynthesisColumns = getTableColumns(noOpSyntheses);

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

	const mapTeam = (row: typeof teams.$inferSelect): Team => ({
		...row,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	});

	const mapTeamMember = (row: typeof teamMembers.$inferSelect): TeamMember => ({
		...row,
		role: row.role as TeamMemberRole,
		createdAt: row.createdAt.toISOString(),
	});

	const mapProject = (row: typeof projects.$inferSelect): Project => ({
		...row,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	});

	const mapNoise = (row: typeof noise.$inferSelect): Noise => ({
		...row,
		createdAt: row.createdAt.toISOString(),
	});

	const mapInitiative = (
		row: typeof initiatives.$inferSelect,
		noiseIds: string[],
	): Initiative => ({
		...row,
		state: row.state as InitiativeState,
		noiseIds,
		mergedIntoInitiativeId: row.mergedIntoInitiativeId ?? undefined,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		startedAt: row.startedAt?.toISOString(),
		startedByUserId: row.startedByUserId ?? undefined,
		completedAt: row.completedAt?.toISOString(),
		completedByUserId: row.completedByUserId ?? undefined,
		outcomeSummary: row.outcomeSummary ?? undefined,
	});

	const mapInitiativeQueueEntry = (
		row: typeof initiativeQueue.$inferSelect,
	): InitiativeQueueEntry => ({
		...row,
		queuedAt: row.queuedAt.toISOString(),
	});

	const mapNoOpSynthesis = (
		row: typeof noOpSyntheses.$inferSelect,
		noiseIds: string[],
	): NoOpSynthesis => ({
		...row,
		noiseIds,
		createdAt: row.createdAt.toISOString(),
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

	const getInitiativeNoiseIds = async (initiativeId: string) =>
		(
			await db
				.select({ noiseId: initiativeNoise.noiseId })
				.from(initiativeNoise)
				.where(eq(initiativeNoise.initiativeId, initiativeId))
				.orderBy(asc(initiativeNoise.position))
		).map((item) => item.noiseId);

	const mapStoredInitiative = async (row: typeof initiatives.$inferSelect) =>
		mapInitiative(row, await getInitiativeNoiseIds(row.id));

	const getNoOpSynthesisNoiseIds = async (noOpSynthesisId: string) =>
		(
			await db
				.select({ noiseId: noOpSynthesisNoise.noiseId })
				.from(noOpSynthesisNoise)
				.where(eq(noOpSynthesisNoise.noOpSynthesisId, noOpSynthesisId))
				.orderBy(asc(noOpSynthesisNoise.position))
		).map((item) => item.noiseId);

	const mapStoredNoOpSynthesis = async (
		row: typeof noOpSyntheses.$inferSelect,
	) => mapNoOpSynthesis(row, await getNoOpSynthesisNoiseIds(row.id));

	const activeQueueItem = (queueId: string) =>
		and(eq(queueItems.queueId, queueId), ne(queueItems.status, "done"));

	const repository: LearningRepository &
		QueueRepository & {
			close(): Promise<void>;
			migrate(): Promise<void>;
		} & TeamProjectRepository &
		ProjectNoiseRepository &
		ProjectInitiativeRepository &
		ProjectNoOpSynthesisRepository = {
		async createTeam(input) {
			return db.transaction(async (tx) => {
				const [team] = await tx
					.insert(teams)
					.values({ name: input.name })
					.returning();
				if (!team) throw new Error("Failed to create Team.");
				await tx.insert(teamMembers).values({
					teamId: team.id,
					userId: input.ownerId,
					role: "owner",
				});
				return mapTeam(team);
			});
		},
		async getTeam(id: string) {
			const [team] = await db
				.select(teamColumns)
				.from(teams)
				.where(eq(teams.id, id));
			return team ? mapTeam(team) : undefined;
		},
		async joinTeam(teamId: string, userId: string) {
			const [created] = await db
				.insert(teamMembers)
				.values({ teamId, userId, role: "member" })
				.onConflictDoNothing()
				.returning();
			if (created) return mapTeamMember(created);
			const [existing] = await db
				.select()
				.from(teamMembers)
				.where(
					and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
				);
			if (!existing) throw new Error("Failed to join Team.");
			return mapTeamMember(existing);
		},
		async getTeamMember(teamId: string, userId: string) {
			const [member] = await db
				.select()
				.from(teamMembers)
				.where(
					and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)),
				);
			return member ? mapTeamMember(member) : undefined;
		},
		async createProject(input: ProjectCreate) {
			const [project] = await db.insert(projects).values(input).returning();
			if (!project) throw new Error("Failed to create Project.");
			return mapProject(project);
		},
		async getProject(id: string) {
			const [project] = await db
				.select(projectColumns)
				.from(projects)
				.where(eq(projects.id, id));
			return project ? mapProject(project) : undefined;
		},
		async createNoise(input: NoiseCreate) {
			const [row] = await db.insert(noise).values(input).returning();
			if (!row) throw new Error("Failed to create Noise.");
			return mapNoise(row);
		},
		async getNoise(ids: string[]) {
			if (!ids.length) return [];
			return (
				await db.select(noiseColumns).from(noise).where(inArray(noise.id, ids))
			).map(mapNoise);
		},
		async listNoise(projectId: string, options = {}) {
			return (
				await db
					.select(noiseColumns)
					.from(noise)
					.where(eq(noise.projectId, projectId))
					.orderBy(desc(noise.createdAt))
					.limit(options.limit ?? 100)
			).map(mapNoise);
		},
		async countNoise(projectId: string) {
			const [row] = await db
				.select({ count: sql<number>`count(*)` })
				.from(noise)
				.where(eq(noise.projectId, projectId));
			return Number(row?.count ?? 0);
		},
		async createInitiative(input: InitiativeCreate) {
			return db.transaction(async (tx) => {
				const [initiative] = await tx
					.insert(initiatives)
					.values({
						projectId: input.projectId,
						statement: input.statement,
					})
					.returning();
				if (!initiative) throw new Error("Failed to create Initiative.");
				await tx.insert(initiativeNoise).values(
					input.noiseIds.map((noiseId, index) => ({
						initiativeId: initiative.id,
						noiseId,
						position: index + 1,
					})),
				);
				return mapInitiative(initiative, input.noiseIds);
			});
		},
		async getInitiative(id: string) {
			const [initiative] = await db
				.select(initiativeColumns)
				.from(initiatives)
				.where(eq(initiatives.id, id));
			return initiative ? mapStoredInitiative(initiative) : undefined;
		},
		async attachNoise(initiativeId: string, noiseIds: string[]) {
			return db.transaction(async (tx) => {
				const [initiative] = await tx
					.select(initiativeColumns)
					.from(initiatives)
					.where(eq(initiatives.id, initiativeId));
				if (!initiative) throw new Error("Failed to find Initiative.");
				const existingNoise = await tx
					.select({
						noiseId: initiativeNoise.noiseId,
						position: initiativeNoise.position,
					})
					.from(initiativeNoise)
					.where(eq(initiativeNoise.initiativeId, initiativeId))
					.orderBy(asc(initiativeNoise.position));
				const nextPosition = (existingNoise.at(-1)?.position ?? 0) + 1;
				await tx.insert(initiativeNoise).values(
					noiseIds.map((noiseId, index) => ({
						initiativeId,
						noiseId,
						position: nextPosition + index,
					})),
				);
				const [updatedInitiative] = await tx
					.update(initiatives)
					.set({ updatedAt: new Date() })
					.where(eq(initiatives.id, initiativeId))
					.returning();
				if (!updatedInitiative) throw new Error("Failed to update Initiative.");
				return mapInitiative(updatedInitiative, [
					...existingNoise.map((item) => item.noiseId),
					...noiseIds,
				]);
			});
		},
		async updateInitiative(id: string, statement: string) {
			const [initiative] = await db
				.update(initiatives)
				.set({ statement, updatedAt: new Date() })
				.where(
					and(
						eq(initiatives.id, id),
						eq(initiatives.state, "signal"),
						isNull(initiatives.mergedIntoInitiativeId),
					),
				)
				.returning();
			return initiative ? mapStoredInitiative(initiative) : undefined;
		},
		async mergeInitiatives(input: InitiativeMergeCreate) {
			return db.transaction(async (tx) => {
				const [survivor] = await tx
					.select(initiativeColumns)
					.from(initiatives)
					.where(eq(initiatives.id, input.survivingInitiativeId));
				if (!survivor) throw new Error("Failed to find surviving Initiative.");
				const existingNoise = await tx
					.select({
						noiseId: initiativeNoise.noiseId,
						position: initiativeNoise.position,
					})
					.from(initiativeNoise)
					.where(eq(initiativeNoise.initiativeId, input.survivingInitiativeId))
					.orderBy(asc(initiativeNoise.position));
				const absorbedNoise = await Promise.all(
					input.absorbedInitiativeIds.map(async (initiativeId) =>
						tx
							.select({
								noiseId: initiativeNoise.noiseId,
								position: initiativeNoise.position,
							})
							.from(initiativeNoise)
							.where(eq(initiativeNoise.initiativeId, initiativeId))
							.orderBy(asc(initiativeNoise.position)),
					),
				);
				const allNoiseIds = [
					...existingNoise.map((item) => item.noiseId),
					...absorbedNoise.flat().map((item) => item.noiseId),
				];
				const seenNoiseIds = new Set<string>();
				const mergedNoiseIds = allNoiseIds.filter((id) => {
					if (seenNoiseIds.has(id)) return false;
					seenNoiseIds.add(id);
					return true;
				});
				const newNoiseIds = mergedNoiseIds.slice(existingNoise.length);
				if (newNoiseIds.length) {
					await tx.insert(initiativeNoise).values(
						newNoiseIds.map((noiseId, index) => ({
							initiativeId: input.survivingInitiativeId,
							noiseId,
							position: existingNoise.length + index + 1,
						})),
					);
				}
				const [updatedSurvivor] = await tx
					.update(initiatives)
					.set({ updatedAt: new Date() })
					.where(eq(initiatives.id, input.survivingInitiativeId))
					.returning();
				if (!updatedSurvivor) throw new Error("Failed to update Initiative.");
				await tx
					.update(initiatives)
					.set({
						mergedIntoInitiativeId: input.survivingInitiativeId,
						updatedAt: new Date(),
					})
					.where(inArray(initiatives.id, input.absorbedInitiativeIds));
				await tx.insert(initiativeMerges).values(
					input.absorbedInitiativeIds.map((absorbedInitiativeId) => ({
						survivingInitiativeId: input.survivingInitiativeId,
						absorbedInitiativeId,
						mergedByUserId: input.mergedByUserId,
					})),
				);
				return mapInitiative(updatedSurvivor, mergedNoiseIds);
			});
		},
		async graduateInitiative(
			initiativeId: string,
			projectId: string,
			queuedByUserId: string,
		) {
			return db.transaction(async (tx) => {
				const [initiative] = await tx
					.update(initiatives)
					.set({ state: "queued", updatedAt: new Date() })
					.where(
						and(
							eq(initiatives.id, initiativeId),
							eq(initiatives.projectId, projectId),
							eq(initiatives.state, "signal"),
							isNull(initiatives.mergedIntoInitiativeId),
						),
					)
					.returning();
				if (!initiative) return undefined;
				const [last] = await tx
					.select({ position: initiativeQueue.position })
					.from(initiativeQueue)
					.where(eq(initiativeQueue.projectId, projectId))
					.orderBy(desc(initiativeQueue.position))
					.limit(1);
				await tx.insert(initiativeQueue).values({
					initiativeId,
					projectId,
					position: (last?.position ?? 0) + 1,
					queuedByUserId,
				});
				const noiseIds = (
					await tx
						.select({ noiseId: initiativeNoise.noiseId })
						.from(initiativeNoise)
						.where(eq(initiativeNoise.initiativeId, initiativeId))
						.orderBy(asc(initiativeNoise.position))
				).map((item) => item.noiseId);
				return mapInitiative(initiative, noiseIds);
			});
		},
		async startNextInitiative(projectId: string, startedByUserId: string) {
			return db.transaction(async (tx) => {
				const [next] = await tx
					.select(initiativeQueueColumns)
					.from(initiativeQueue)
					.where(eq(initiativeQueue.projectId, projectId))
					.orderBy(asc(initiativeQueue.position))
					.limit(1);
				if (!next) return undefined;
				const [initiative] = await tx
					.update(initiatives)
					.set({
						state: "executing",
						startedAt: new Date(),
						startedByUserId,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(initiatives.id, next.initiativeId),
							eq(initiatives.state, "queued"),
						),
					)
					.returning();
				if (!initiative) return undefined;
				await tx
					.delete(initiativeQueue)
					.where(eq(initiativeQueue.initiativeId, next.initiativeId));
				await tx
					.update(initiativeQueue)
					.set({ position: sql`${initiativeQueue.position} - 1` })
					.where(
						and(
							eq(initiativeQueue.projectId, projectId),
							gt(initiativeQueue.position, next.position),
						),
					);
				const noiseIds = (
					await tx
						.select({ noiseId: initiativeNoise.noiseId })
						.from(initiativeNoise)
						.where(eq(initiativeNoise.initiativeId, initiative.id))
						.orderBy(asc(initiativeNoise.position))
				).map((item) => item.noiseId);
				return mapInitiative(initiative, noiseIds);
			});
		},
		async completeInitiative(
			initiativeId: string,
			completedByUserId: string,
			outcomeSummary: string,
		) {
			const [initiative] = await db
				.update(initiatives)
				.set({
					state: "completed",
					completedAt: new Date(),
					completedByUserId,
					outcomeSummary,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(initiatives.id, initiativeId),
						eq(initiatives.state, "executing"),
					),
				)
				.returning();
			return initiative ? mapStoredInitiative(initiative) : undefined;
		},
		async createNoOpSynthesis(input: NoOpSynthesisCreate) {
			return db.transaction(async (tx) => {
				const [decision] = await tx
					.insert(noOpSyntheses)
					.values({
						projectId: input.projectId,
						rationale: input.rationale,
						requestedByUserId: input.requestedByUserId,
					})
					.returning();
				if (!decision) throw new Error("Failed to record no-op synthesis.");
				await tx.insert(noOpSynthesisNoise).values(
					input.noiseIds.map((noiseId, index) => ({
						noOpSynthesisId: decision.id,
						noiseId,
						position: index + 1,
					})),
				);
				return mapNoOpSynthesis(decision, input.noiseIds);
			});
		},
		async listNoOpSyntheses(projectId: string, options = {}) {
			const rows = await db
				.select(noOpSynthesisColumns)
				.from(noOpSyntheses)
				.where(eq(noOpSyntheses.projectId, projectId))
				.orderBy(desc(noOpSyntheses.createdAt))
				.limit(options.limit ?? 100);
			return Promise.all(rows.map(mapStoredNoOpSynthesis));
		},
		async listWorkshopInitiatives(projectId: string, options = {}) {
			const rows = await db
				.select(initiativeColumns)
				.from(initiatives)
				.where(
					and(
						eq(initiatives.projectId, projectId),
						eq(initiatives.state, "signal"),
						isNull(initiatives.mergedIntoInitiativeId),
					),
				)
				.orderBy(desc(initiatives.createdAt))
				.limit(options.limit ?? 100);
			return Promise.all(rows.map(mapStoredInitiative));
		},
		async countWorkshopInitiatives(projectId: string) {
			const [row] = await db
				.select({ count: sql<number>`count(*)` })
				.from(initiatives)
				.where(
					and(
						eq(initiatives.projectId, projectId),
						eq(initiatives.state, "signal"),
						isNull(initiatives.mergedIntoInitiativeId),
					),
				);
			return Number(row?.count ?? 0);
		},
		async listInitiativeQueue(projectId: string, options = {}) {
			return (
				await db
					.select(initiativeQueueColumns)
					.from(initiativeQueue)
					.where(eq(initiativeQueue.projectId, projectId))
					.orderBy(asc(initiativeQueue.position))
					.limit(options.limit ?? 100)
			).map(mapInitiativeQueueEntry);
		},
		async countInitiativeQueue(projectId: string) {
			const [row] = await db
				.select({ count: sql<number>`count(*)` })
				.from(initiativeQueue)
				.where(eq(initiativeQueue.projectId, projectId));
			return Number(row?.count ?? 0);
		},
		async countOutcomes(projectId: string) {
			const [row] = await db
				.select({ count: sql<number>`count(*)` })
				.from(initiatives)
				.where(
					and(
						eq(initiatives.projectId, projectId),
						eq(initiatives.state, "completed"),
					),
				);
			return Number(row?.count ?? 0);
		},
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
