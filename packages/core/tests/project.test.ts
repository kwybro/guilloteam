import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initializeProject, readConfig } from "../src";

const directories: string[] = [];
afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

test("initializes local Intent against a shared Learning service", async () => {
	const root = await mkdtemp(join(tmpdir(), "guilloteam-project-"));
	directories.push(root);
	await initializeProject(root, "Arcade", "https://learning.example.com");

	expect(await readConfig(root)).toEqual({
		version: 1,
		intentDirectory: "intent",
		learning: {
			type: "remote",
			url: "https://learning.example.com",
		},
	});
	expect(
		await readFile(
			join(root, ".guilloteam", "intent", "constitution.md"),
			"utf8",
		),
	).toContain("# Arcade Constitution");
});
