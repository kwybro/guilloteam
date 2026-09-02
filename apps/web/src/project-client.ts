import type {
	Initiative,
	InitiativeQueueEntry,
	Noise,
	Project,
	ProjectWorkspace,
	Team,
	WorkspaceFocus,
} from "@guilloteam/core";

export interface ProjectClientOptions {
	projectId: string;
	userId: string;
	token: string;
	baseUrl?: string;
	fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export interface ProjectWorkspaceData {
	workspace: ProjectWorkspace;
	noise: Noise[];
	workshop: Initiative[];
	queue: Array<InitiativeQueueEntry & { initiative?: Initiative }>;
}

export interface TeamClientOptions {
	userId: string;
	token: string;
	baseUrl?: string;
	fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

function createRequest(options: TeamClientOptions) {
	return async <T>(path: string, init?: RequestInit): Promise<T> => {
		const response = await (options.fetch ?? fetch)(
			`${options.baseUrl ?? ""}${path}`,
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
			throw new Error(`Guilloteam service returned ${response.status}.`);
		}
		return response.json() as Promise<T>;
	};
}

export function createTeamClient(options: TeamClientOptions) {
	const request = createRequest(options);
	const userId = encodeURIComponent(options.userId);
	return {
		listTeams() {
			return request<Team[]>(`/v1/teams?userId=${userId}`);
		},
		listProjects(teamId: string) {
			return request<Project[]>(
				`/v1/teams/${encodeURIComponent(teamId)}/projects?userId=${userId}`,
			);
		},
		createProject(teamId: string, name: string) {
			return request<Project>(
				`/v1/teams/${encodeURIComponent(teamId)}/projects`,
				{
					method: "POST",
					body: JSON.stringify({ name, userId: options.userId }),
				},
			);
		},
		setWorkspaceFocus(teamId: string, projectId: string) {
			return request<WorkspaceFocus>("/v1/workspace-focus", {
				method: "PUT",
				body: JSON.stringify({ userId: options.userId, teamId, projectId }),
			});
		},
	};
}

export function createProjectClient(options: ProjectClientOptions) {
	const request = createRequest(options);
	const projectPath = `/v1/projects/${encodeURIComponent(options.projectId)}`;
	return {
		async loadWorkspace(): Promise<ProjectWorkspaceData> {
			const [workspace, noise, workshop, queue] = await Promise.all([
				request<ProjectWorkspace>(`${projectPath}/workspace`),
				request<Noise[]>(`${projectPath}/noise`),
				request<Initiative[]>(`${projectPath}/workshop`),
				request<InitiativeQueueEntry[]>(`${projectPath}/queue`),
			]);
			const queueWithInitiatives = await Promise.all(
				queue.map(async (entry) => ({
					...entry,
					initiative: await request<Initiative>(
						`${projectPath}/initiatives/${encodeURIComponent(entry.initiativeId)}`,
					),
				})),
			);
			return { workspace, noise, workshop, queue: queueWithInitiatives };
		},
		captureNoise(input: { content: string; source: string }) {
			return request<Noise>(`${projectPath}/noise`, {
				method: "POST",
				body: JSON.stringify({ ...input, userId: options.userId }),
			});
		},
		graduateInitiative(initiativeId: string) {
			return request<Initiative>(
				`${projectPath}/initiatives/${encodeURIComponent(initiativeId)}/graduate`,
				{
					method: "POST",
					body: JSON.stringify({ userId: options.userId }),
				},
			);
		},
		startNextInitiative() {
			return request<Initiative>(`${projectPath}/queue/start-next`, {
				method: "POST",
				body: JSON.stringify({ userId: options.userId }),
			});
		},
	};
}
