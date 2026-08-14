import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createProductContext, initializeProject } from "@guilloteam/core";
import { createDrizzleLearningStore } from "../src";

const directories: string[] = [];
afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("Phase 0 workflow", () => {
	test("turns observations into inspectable evidence without owning inference", async () => {
		const root = await mkdtemp(join(tmpdir(), "guilloteam-"));
		directories.push(root);
		const initialized = await initializeProject(root, "Test Product");
		expect(await readFile(join(root, ".gitignore"), "utf8")).toContain(
			".guilloteam/learning.db*",
		);
		const store = createDrizzleLearningStore(initialized.databasePath);
		const context = createProductContext(root, store);

		const first = await context.observe({
			type: "user_feedback",
			content: "I need folders.",
		});
		const second = await context.observe({
			type: "proposal",
			content: "Let me group projects.",
		});
		expect(
			(await context.getPendingContextWork()).unsynthesizedObservationCount,
		).toBe(2);

		const evidence = await context.createEvidence({
			title: "Project organization pressure",
			claim: "Users are struggling to organize projects.",
			confidence: "medium",
			observationIds: [first.id, second.id],
			intentReferences: ["constitution:principles"],
			createdBy: "test-agent",
		});

		expect(evidence.observationIds).toEqual([first.id, second.id]);
		expect(
			await context.listObservations({ unsynthesizedOnly: true }),
		).toHaveLength(0);
		expect((await context.listEvidence())[0]?.claim).toBe(
			"Users are struggling to organize projects.",
		);
		store.close();
	});

	test("rejects evidence that cites observations that do not exist", async () => {
		const root = await mkdtemp(join(tmpdir(), "guilloteam-"));
		directories.push(root);
		const initialized = await initializeProject(root, "Test Product");
		const store = createDrizzleLearningStore(initialized.databasePath);
		const context = createProductContext(root, store);
		await expect(
			context.createEvidence({
				title: "Invented",
				claim: "An unsupported claim",
				confidence: "low",
				observationIds: ["missing"],
			}),
		).rejects.toThrow("Unknown observation IDs");
		store.close();
	});
});
