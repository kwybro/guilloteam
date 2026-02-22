const CONFIG_DIR = `${process.env.HOME}/.guilloteam`;
const CONFIG_PATH = `${CONFIG_DIR}/.env`;
const DEFAULT_API_URL = "https://api.guillo.team";

const LOADING_MESSAGES = [
	"Sharpening the blade...",
	"The blade is falling...",
	"Summoning the guilloteam...",
	"Assembling the crew...",
];

export const randomLoadingMessage = () =>
	LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];

// Parse KEY=VALUE env file format
const parseEnvFile = (text: string): Record<string, string> => {
	const result: Record<string, string> = {};
	for (const line of text.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eqIndex = trimmed.indexOf("=");
		if (eqIndex === -1) continue;
		const key = trimmed.slice(0, eqIndex).trim();
		const value = trimmed.slice(eqIndex + 1).trim();
		if (key) result[key] = value;
	}
	return result;
};

const serializeEnvFile = (env: Record<string, string>): string =>
	Object.entries(env)
		.map(([k, v]) => `${k}=${v}`)
		.join("\n") + "\n";

export type Config = {
	apiUrl: string;
	token: string | undefined;
	teamId: string | undefined;
	projectId: string | undefined;
	userEmail: string | undefined;
	userId: string | undefined;
};

export const readConfig = async (): Promise<Config> => {
	const fileEnv: Record<string, string> = {};
	// TODO: Will Bun run in Cloudflare Workers? What about when self-hosted on AWS?
	const file = Bun.file(CONFIG_PATH);
	if (await file.exists()) {
		Object.assign(fileEnv, parseEnvFile(await file.text()));
	}
	// Use || undefined so that empty string (written by lock/unlock clear operations) is treated as unset
	return {
		apiUrl:
			process.env.GUILLOTEAM_API_URL ??
			fileEnv.GUILLOTEAM_API_URL ??
			DEFAULT_API_URL,
		token: process.env.GUILLOTEAM_TOKEN || fileEnv.GUILLOTEAM_TOKEN || undefined,
		teamId: process.env.GUILLOTEAM_TEAM_ID || fileEnv.GUILLOTEAM_TEAM_ID || undefined,
		projectId: process.env.GUILLOTEAM_PROJECT_ID || fileEnv.GUILLOTEAM_PROJECT_ID || undefined,
		userEmail: process.env.GUILLOTEAM_USER_EMAIL || fileEnv.GUILLOTEAM_USER_EMAIL || undefined,
		userId: process.env.GUILLOTEAM_USER_ID || fileEnv.GUILLOTEAM_USER_ID || undefined,
	};
};

export const writeConfig = async (updates: Record<string, string>) => {
	await Bun.$`mkdir -p ${CONFIG_DIR}`.quiet();
	const file = Bun.file(CONFIG_PATH);
	const existing: Record<string, string> = {};
	if (await file.exists()) {
		Object.assign(existing, parseEnvFile(await file.text()));
	}
	await Bun.write(CONFIG_PATH, serializeEnvFile({ ...existing, ...updates }));
};

// Typed fetch wrapper — reads config, injects auth header, handles errors.
// On 4xx: writes JSON error to stderr, exits 1.
// On 5xx: writes JSON error to stderr, exits 2.
export const apiFetch = async <T>(
	path: string,
	options: RequestInit = {},
): Promise<T> => {
	const { apiUrl, token } = await readConfig();

	const res = await fetch(`${apiUrl}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(options.headers ?? {}),
		},
	});

	if (!res.ok) {
		const body = await res
			.json()
			.catch(() => ({ error: res.statusText }));
		process.stderr.write(`${JSON.stringify(body)}\n`);
		process.exit(res.status >= 500 ? 2 : 1);
	}

	return res.json() as Promise<T>;
};

