import type { ObservationInput } from "@guilloteam/core";
import { createRemoteLearningRepository } from "@guilloteam/learning-client";

export interface GuilloteamOptions {
	url: string;
	token: string;
}

export function createGuilloteam(options: GuilloteamOptions) {
	const learning = createRemoteLearningRepository(options);
	return {
		observe: (input: ObservationInput) => learning.createObservation(input),
	};
}

export type { Observation, ObservationInput } from "@guilloteam/core";
