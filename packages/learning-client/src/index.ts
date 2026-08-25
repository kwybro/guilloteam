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
