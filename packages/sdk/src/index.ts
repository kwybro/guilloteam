import { join, resolve } from "node:path";
import type { LearningRepository } from "@guilloteam/core";
import { createProductContext } from "@guilloteam/core";
import { createDrizzleLearningStore } from "@guilloteam/storage-drizzle";

export interface GuilloteamOptions {
	root?: string;
	learning?: LearningRepository;
}

export function createGuilloteam(options: GuilloteamOptions = {}) {
	const root = resolve(options.root ?? process.cwd());
	const ownedStore = options.learning
		? undefined
		: createDrizzleLearningStore(join(root, ".guilloteam", "learning.db"));
	const learning = options.learning ?? ownedStore;
	if (!learning) throw new Error("A Learning repository is required.");
	const service = createProductContext(root, learning);
	return {
		...service,
		close: () => ownedStore?.close(),
	};
}

export type {
	Evidence,
	EvidenceInput,
	Intent,
	LearningRepository,
	Observation,
	ObservationInput,
} from "@guilloteam/core";
