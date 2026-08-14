import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export interface GuilloteamConfig {
	version: 1;
	intentDirectory: string;
	learning: { type: "remote"; url: string };
}

export async function initializeProject(
	root: string,
	name: string,
	serviceUrl = "http://localhost:3400",
) {
	const contextDirectory = join(root, ".guilloteam");
	const intentDirectory = join(contextDirectory, "intent");
	await mkdir(intentDirectory, { recursive: true });
	await writeFile(
		join(intentDirectory, "constitution.md"),
		`# ${name} Constitution\n\n## Purpose\n\nWhat enduring purpose does this product serve?\n\n## People\n\nWho is it for?\n\n## Principles\n\n- Add the principles that should guide interpretation and decisions.\n\n## Boundaries\n\n- Add what this product intentionally will not become.\n`,
		{ flag: "wx" },
	).catch(ignoreExisting);
	await writeFile(
		join(intentDirectory, "world-model.md"),
		`# ${name} World Model\n\n## Product\n\nDescribe what exists today.\n\n## Concepts\n\nDefine the important entities and shared vocabulary.\n\n## Workflows\n\nDescribe the important user workflows.\n`,
		{ flag: "wx" },
	).catch(ignoreExisting);
	const config: GuilloteamConfig = {
		version: 1,
		intentDirectory: "intent",
		learning: { type: "remote", url: serviceUrl },
	};
	await writeFile(
		join(contextDirectory, "config.json"),
		`${JSON.stringify(config, null, 2)}\n`,
		{ flag: "wx" },
	).catch(ignoreExisting);
	return { contextDirectory };
}

function ignoreExisting(error: NodeJS.ErrnoException) {
	if (error.code !== "EEXIST") throw error;
}

export async function findProjectRoot(start: string): Promise<string> {
	let current = resolve(start);
	while (true) {
		try {
			await access(join(current, ".guilloteam", "config.json"));
			return current;
		} catch {
			const parent = dirname(current);
			if (parent === current) {
				throw new Error(
					"No Guilloteam project found. Run guilloteam init first.",
				);
			}
			current = parent;
		}
	}
}

export async function readConfig(root: string): Promise<GuilloteamConfig> {
	const config = JSON.parse(
		await readFile(join(root, ".guilloteam", "config.json"), "utf8"),
	) as GuilloteamConfig;
	if (
		config.version !== 1 ||
		config.learning?.type !== "remote" ||
		!config.learning.url
	) {
		throw new Error("Invalid Guilloteam configuration.");
	}
	return config;
}

export async function readIntent(root: string) {
	const directory = join(root, ".guilloteam", "intent");
	const [constitution, worldModel] = await Promise.all([
		readFile(join(directory, "constitution.md"), "utf8"),
		readFile(join(directory, "world-model.md"), "utf8"),
	]);
	return { constitution, worldModel };
}
