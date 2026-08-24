import type {
	EvidenceInput,
	LearningRepository,
	ObservationInput,
} from "./model";
import { evidenceInputSchema, observationInputSchema } from "./model";
import { readIntent } from "./project";

export function createProductContext(
	root: string,
	learning: LearningRepository,
) {
	return {
		async observe(raw: ObservationInput) {
			return learning.createObservation(observationInputSchema.parse(raw));
		},
		async createEvidence(raw: EvidenceInput) {
			const input = evidenceInputSchema.parse(raw);
			const uniqueIds = [...new Set(input.observationIds)];
			if (uniqueIds.length !== input.observationIds.length) {
				throw new Error(
					"Evidence cannot cite the same observation more than once.",
				);
			}
			const observations = await learning.getObservations(uniqueIds);
			const found = new Set(observations.map((item) => item.id));
			const missing = uniqueIds.filter((id) => !found.has(id));
			if (missing.length)
				throw new Error(`Unknown observation IDs: ${missing.join(", ")}`);
			return learning.createEvidence({ ...input, observationIds: uniqueIds });
		},
		getIntent: () => readIntent(root),
		listObservations: (options?: {
			unsynthesizedOnly?: boolean;
			limit?: number;
		}) => learning.listObservations(options),
		listEvidence: (options?: { limit?: number }) =>
			learning.listEvidence(options),
		async getPendingContextWork() {
			const observations = await learning.listObservations({
				unsynthesizedOnly: true,
				limit: 500,
			});
			return {
				unsynthesizedObservationCount: observations.length,
				recommendedAction: observations.length ? "synthesize_evidence" : "none",
			};
		},
		async getProductContext() {
			const [intent, observations, evidence] = await Promise.all([
				readIntent(root),
				learning.listObservations({ limit: 100 }),
				learning.listEvidence({ limit: 100 }),
			]);
			return { intent, learning: { observations, evidence } };
		},
	};
}
