import {
	access,
	appendFile,
	mkdir,
	readFile,
	writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export async function initializeProject(root: string, name: string) {
	const contextDirectory = join(root, ".guilloteam");
	const intentDirectory = join(contextDirectory, "intent");
	await mkdir(intentDirectory, { recursive: true });
	await writeFile(
		join(intentDirectory, "constitution.md"),
		`# ${name} Constitution\n\n## Purpose\n\nWhat enduring purpose does this product serve?\n\n## People\n\nWho is it for?\n\n## Principles\n\n- Add the principles that should guide interpretation and decisions.\n\n## Boundaries\n\n- Add what this product intentionally will not become.\n`,
		{ flag: "wx" },
	).catch((error: NodeJS.ErrnoException) => {
		if (error.code !== "EEXIST") throw error;
	});
	await writeFile(
		join(intentDirectory, "world-model.md"),
		`# ${name} World Model\n\n## Product\n\nDescribe what exists today.\n\n## Concepts\n\nDefine the important entities and shared vocabulary.\n\n## Workflows\n\nDescribe the important user workflows.\n`,
		{ flag: "wx" },
	).catch((error: NodeJS.ErrnoException) => {
		if (error.code !== "EEXIST") throw error;
	});
	await writeFile(
		join(contextDirectory, "config.json"),
		`${JSON.stringify({ version: 1, intentDirectory: "intent", database: "learning.db" }, null, 2)}\n`,
		{ flag: "wx" },
	).catch((error: NodeJS.ErrnoException) => {
		if (error.code !== "EEXIST") throw error;
	});
	const gitignorePath = join(root, ".gitignore");
	const gitignore = await readFile(gitignorePath, "utf8").catch(
		(error: NodeJS.ErrnoException) => {
			if (error.code === "ENOENT") return "";
			throw error;
		},
	);
	const ignoreRule = ".guilloteam/learning.db*";
	if (!gitignore.split(/\r?\n/).includes(ignoreRule)) {
		await appendFile(
			gitignorePath,
			`${gitignore.length && !gitignore.endsWith("\n") ? "\n" : ""}${ignoreRule}\n`,
		);
	}
	return {
		contextDirectory,
		databasePath: join(contextDirectory, "learning.db"),
	};
}

export async function findProjectRoot(start: string): Promise<string> {
	let current = resolve(start);
	while (true) {
		try {
			await access(join(current, ".guilloteam", "config.json"));
			return current;
		} catch {
			const parent = dirname(current);
			if (parent === current)
				throw new Error(
					"No Guilloteam project found. Run guilloteam init first.",
				);
			current = parent;
		}
	}
}

export async function readIntent(root: string) {
	const directory = join(root, ".guilloteam", "intent");
	const [constitution, worldModel] = await Promise.all([
		readFile(join(directory, "constitution.md"), "utf8"),
		readFile(join(directory, "world-model.md"), "utf8"),
	]);
	return { constitution, worldModel };
}
