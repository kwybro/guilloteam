import type {
	Evidence,
	EvidenceInput,
	LearningRepository,
	Observation,
	ObservationInput,
} from "@guilloteam/core";

export interface RemoteLearningOptions {
	url: string;
	token: string;
	fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export function createRemoteLearningRepository(
	options: RemoteLearningOptions,
): LearningRepository {
	const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
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
