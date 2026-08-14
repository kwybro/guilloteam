import { z } from "zod";

export const observationInputSchema = z.object({
	type: z.string().trim().min(1),
	content: z.string().trim().min(1),
	source: z.string().trim().min(1).optional(),
	actorId: z.string().trim().min(1).optional(),
	metadata: z.record(z.string(), z.unknown()).default({}),
	observedAt: z.string().datetime().optional(),
});

export const evidenceInputSchema = z.object({
	title: z.string().trim().min(1),
	claim: z.string().trim().min(1),
	confidence: z.enum(["low", "medium", "high"]),
	rationale: z.string().trim().min(1).optional(),
	observationIds: z.array(z.string().min(1)).min(1),
	intentReferences: z.array(z.string().min(1)).default([]),
	createdBy: z.string().trim().min(1).optional(),
});

export type ObservationInput = z.input<typeof observationInputSchema>;
export type EvidenceInput = z.input<typeof evidenceInputSchema>;

export interface Observation {
	id: string;
	type: string;
	content: string;
	source?: string;
	actorId?: string;
	metadata: Record<string, unknown>;
	observedAt: string;
	createdAt: string;
	synthesized: boolean;
}

export interface Evidence {
	id: string;
	title: string;
	claim: string;
	confidence: "low" | "medium" | "high";
	rationale?: string;
	observationIds: string[];
	intentReferences: string[];
	createdBy?: string;
	createdAt: string;
}

export interface Intent {
	constitution: string;
	worldModel: string;
}

export interface LearningRepository {
	createObservation(input: ObservationInput): Promise<Observation>;
	listObservations(options?: {
		unsynthesizedOnly?: boolean;
		limit?: number;
	}): Promise<Observation[]>;
	getObservations(ids: string[]): Promise<Observation[]>;
	createEvidence(input: EvidenceInput): Promise<Evidence>;
	listEvidence(options?: { limit?: number }): Promise<Evidence[]>;
}
