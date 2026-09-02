import type {
	AttachInitiativeNoiseInput,
	CompleteQueueItemInput,
	Evidence,
	EvidenceInput,
	Initiative,
	InitiativeQueueEntry,
	Input,
	InputInput,
	InputUpdate,
	JoinTeamInput,
	LearningRepository,
	MergeInitiativesInput,
	Noise,
	NoiseInput,
	NoOpSynthesis,
	NoOpSynthesisInput,
	Observation,
	ObservationInput,
	Project,
	ProjectInput,
	ProjectWorkspace,
	Queue,
	QueueInput,
	QueueItem,
	QueueItemCreate,
	QueueItemReadiness,
	QueueItemUpdate,
	QueueRepository,
	QueueUpdate,
	SynthesizeNoiseInput,
	Team,
	TeamInput,
	TeamMember,
	UpdateInitiativeInput,
	WorkspaceFocus,
	WorkspaceFocusInput,
} from "@guilloteam/core";

export interface RemoteLearningOptions {
	url: string;
	token: string;
	fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

function createRemoteRequest(options: RemoteLearningOptions) {
	return async function request<T>(
		path: string,
		init?: RequestInit,
	): Promise<T> {
		const response = await (options.fetch ?? fetch)(
			`${options.url.replace(/\/$/, "")}${path}`,
			{
				...init,
				headers: {
					authorization: `Bearer ${options.token}`,
					"content-type": "application/json",
					...init?.headers,
				},
			},
		);
		if (!response.ok) {
			const body = await response.text();
			throw new Error(
				`Guilloteam service returned ${response.status}: ${body}`,
			);
		}
		return response.json() as Promise<T>;
	};
}

export function createRemoteLearningRepository(
	options: RemoteLearningOptions,
): LearningRepository {
	const request = createRemoteRequest(options);
	return {
		createObservation: (input: ObservationInput) =>
			request<Observation>("/v1/observations", {
				method: "POST",
				body: JSON.stringify(input),
			}),
		listObservations: (options = {}) => {
			const query = new URLSearchParams();
			if (options.unsynthesizedOnly) query.set("unsynthesizedOnly", "true");
			if (options.limit) query.set("limit", String(options.limit));
			return request<Observation[]>(`/v1/observations?${query}`);
		},
		getObservations: (ids: string[]) =>
			request<Observation[]>(
				`/v1/observations?ids=${encodeURIComponent(ids.join(","))}`,
			),
		createEvidence: (input: EvidenceInput) =>
			request<Evidence>("/v1/evidence", {
				method: "POST",
				body: JSON.stringify(input),
			}),
		listEvidence: (options = {}) =>
			request<Evidence[]>(
				`/v1/evidence${options.limit ? `?limit=${options.limit}` : ""}`,
			),
	};
}

export function createRemoteQueueRepository(
	options: RemoteLearningOptions,
): QueueRepository {
	const request = createRemoteRequest(options);
	return {
		createInput: (input: InputInput) =>
			request<Input>("/v1/inputs", {
				method: "POST",
				body: JSON.stringify(input),
			}),
		listInputs: (options = {}) => {
			const query = new URLSearchParams();
			if (options.unlinkedOnly) query.set("unlinkedOnly", "true");
			if (options.limit) query.set("limit", String(options.limit));
			return request<Input[]>(`/v1/inputs?${query}`);
		},
		getInputs: (ids: string[]) =>
			Promise.all(
				ids.map((id) => request<Input>(`/v1/inputs/${encodeURIComponent(id)}`)),
			),
		updateInput: (id: string, input: InputUpdate) =>
			request<Input>(`/v1/inputs/${encodeURIComponent(id)}`, {
				method: "PATCH",
				body: JSON.stringify(input),
			}),
		createQueue: (input: QueueInput) =>
			request<Queue>("/v1/queues", {
				method: "POST",
				body: JSON.stringify(input),
			}),
		listQueues: (options = {}) =>
			request<Queue[]>(
				`/v1/queues${options.limit ? `?limit=${options.limit}` : ""}`,
			),
		getQueue: (id: string) =>
			request<Queue>(`/v1/queues/${encodeURIComponent(id)}`),
		updateQueue: (id: string, input: QueueUpdate) =>
			request<Queue>(`/v1/queues/${encodeURIComponent(id)}`, {
				method: "PATCH",
				body: JSON.stringify(input),
			}),
		createQueueItem: (input: QueueItemCreate) =>
			request<QueueItem>("/v1/queue-items", {
				method: "POST",
				body: JSON.stringify(input),
			}),
		getQueueItem: (id: string) =>
			request<QueueItem>(`/v1/queue-items/${encodeURIComponent(id)}`),
		listQueueItems: (options) => {
			const query = new URLSearchParams({ queueId: options.queueId });
			if (options.includeDone) query.set("includeDone", "true");
			if (options.limit) query.set("limit", String(options.limit));
			return request<QueueItem[]>(`/v1/queue-items?${query}`);
		},
		updateQueueItem: (id: string, input: QueueItemUpdate) =>
			request<QueueItem>(`/v1/queue-items/${encodeURIComponent(id)}`, {
				method: "PATCH",
				body: JSON.stringify(input),
			}),
		moveQueueItem: (id: string, position: number) =>
			request<QueueItem>(`/v1/queue-items/${encodeURIComponent(id)}/move`, {
				method: "POST",
				body: JSON.stringify({ position }),
			}),
		setQueueItemReadiness: (id: string, readiness: QueueItemReadiness) =>
			request<QueueItem>(
				`/v1/queue-items/${encodeURIComponent(id)}/readiness`,
				{
					method: "POST",
					body: JSON.stringify({ readiness }),
				},
			),
		getNextQueueItem: (queueId: string, readiness: QueueItemReadiness) =>
			request<QueueItem | null>(
				`/v1/queues/${encodeURIComponent(queueId)}/next-to-${
					readiness === "ready" ? "execute" : "prepare"
				}`,
			).then((item) => item ?? undefined),
		startQueueItem: (id: string) =>
			request<QueueItem>(`/v1/queue-items/${encodeURIComponent(id)}/start`, {
				method: "POST",
			}),
		completeQueueItem: (id: string, input: CompleteQueueItemInput) =>
			request<QueueItem>(`/v1/queue-items/${encodeURIComponent(id)}/complete`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
	};
}

export interface RemoteProjectWorkspaceClient {
	createTeam(input: TeamInput): Promise<Team>;
	joinTeam(teamId: string, input: JoinTeamInput): Promise<TeamMember>;
	createProject(teamId: string, input: ProjectInput): Promise<Project>;
	getWorkspaceFocus(userId: string): Promise<WorkspaceFocus>;
	setWorkspaceFocus(input: WorkspaceFocusInput): Promise<WorkspaceFocus>;
	getProjectWorkspace(projectId: string): Promise<ProjectWorkspace>;
	captureNoise(projectId: string, input: NoiseInput): Promise<Noise>;
	listNoise(projectId: string, options?: { limit?: number }): Promise<Noise[]>;
	synthesizeNoise(
		projectId: string,
		input: SynthesizeNoiseInput,
	): Promise<Initiative>;
	getInitiative(projectId: string, initiativeId: string): Promise<Initiative>;
	updateInitiative(
		projectId: string,
		initiativeId: string,
		input: UpdateInitiativeInput,
	): Promise<Initiative>;
	attachNoiseToInitiative(
		projectId: string,
		initiativeId: string,
		input: AttachInitiativeNoiseInput,
	): Promise<Initiative>;
	mergeInitiatives(
		projectId: string,
		initiativeId: string,
		input: MergeInitiativesInput,
	): Promise<Initiative>;
	deferNoiseSynthesis(
		projectId: string,
		input: NoOpSynthesisInput,
	): Promise<NoOpSynthesis>;
	listDeferredSyntheses(
		projectId: string,
		options?: { limit?: number },
	): Promise<NoOpSynthesis[]>;
	listWorkshopInitiatives(
		projectId: string,
		options?: { limit?: number },
	): Promise<Initiative[]>;
	listInitiativeQueue(
		projectId: string,
		options?: { limit?: number },
	): Promise<InitiativeQueueEntry[]>;
}

function projectPath(projectId: string) {
	return `/v1/projects/${encodeURIComponent(projectId)}`;
}

function optionalLimit(options?: { limit?: number }) {
	return options?.limit ? `?limit=${options.limit}` : "";
}

/**
 * Agent-authorized Project workflows exposed by the Guilloteam HTTP service.
 * The web app and MCP server use this same API surface.
 */
export function createRemoteProjectWorkspaceClient(
	options: RemoteLearningOptions,
): RemoteProjectWorkspaceClient {
	const request = createRemoteRequest(options);
	return {
		createTeam: (input) =>
			request<Team>("/v1/teams", {
				method: "POST",
				body: JSON.stringify(input),
			}),
		joinTeam: (teamId, input) =>
			request<TeamMember>(`/v1/teams/${encodeURIComponent(teamId)}/members`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		createProject: (teamId, input) =>
			request<Project>(`/v1/teams/${encodeURIComponent(teamId)}/projects`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		getWorkspaceFocus: (userId) =>
			request<WorkspaceFocus>(
				`/v1/workspace-focus?userId=${encodeURIComponent(userId)}`,
			),
		setWorkspaceFocus: (input) =>
			request<WorkspaceFocus>("/v1/workspace-focus", {
				method: "PUT",
				body: JSON.stringify(input),
			}),
		getProjectWorkspace: (projectId) =>
			request<ProjectWorkspace>(`${projectPath(projectId)}/workspace`),
		captureNoise: (projectId, input) =>
			request<Noise>(`${projectPath(projectId)}/noise`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		listNoise: (projectId, options) =>
			request<Noise[]>(
				`${projectPath(projectId)}/noise${optionalLimit(options)}`,
			),
		synthesizeNoise: (projectId, input) =>
			request<Initiative>(`${projectPath(projectId)}/initiatives/synthesize`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		getInitiative: (projectId, initiativeId) =>
			request<Initiative>(
				`${projectPath(projectId)}/initiatives/${encodeURIComponent(initiativeId)}`,
			),
		updateInitiative: (projectId, initiativeId, input) =>
			request<Initiative>(
				`${projectPath(projectId)}/initiatives/${encodeURIComponent(initiativeId)}`,
				{ method: "PATCH", body: JSON.stringify(input) },
			),
		attachNoiseToInitiative: (projectId, initiativeId, input) =>
			request<Initiative>(
				`${projectPath(projectId)}/initiatives/${encodeURIComponent(initiativeId)}/noise`,
				{ method: "POST", body: JSON.stringify(input) },
			),
		mergeInitiatives: (projectId, initiativeId, input) =>
			request<Initiative>(
				`${projectPath(projectId)}/initiatives/${encodeURIComponent(initiativeId)}/merge`,
				{ method: "POST", body: JSON.stringify(input) },
			),
		deferNoiseSynthesis: (projectId, input) =>
			request<NoOpSynthesis>(`${projectPath(projectId)}/syntheses/deferred`, {
				method: "POST",
				body: JSON.stringify(input),
			}),
		listDeferredSyntheses: (projectId, options) =>
			request<NoOpSynthesis[]>(
				`${projectPath(projectId)}/syntheses/deferred${optionalLimit(options)}`,
			),
		listWorkshopInitiatives: (projectId, options) =>
			request<Initiative[]>(
				`${projectPath(projectId)}/workshop${optionalLimit(options)}`,
			),
		listInitiativeQueue: (projectId, options) =>
			request<InitiativeQueueEntry[]>(
				`${projectPath(projectId)}/queue${optionalLimit(options)}`,
			),
	};
}
