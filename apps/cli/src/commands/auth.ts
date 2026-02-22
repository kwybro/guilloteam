import { intro, isCancel, outro, spinner, text } from "@clack/prompts";
import { defineCommand } from "citty";
import { apiFetch, randomLoadingMessage, readConfig, writeConfig } from "../utilities";

type RegisterResponse = {
	token: string;
	email: string;
	userId: string;
};

const registerCommand = defineCommand({
	meta: { name: "register", description: "Create a new account and receive an API key" },
	async run() {
		intro("Register");

		const email = await text({ message: "What's your email?" });
		if (isCancel(email)) {
			outro("Cancelled");
			process.exit(0);
		}

		const s = spinner();
		s.start(randomLoadingMessage());
		await apiFetch<{ success: boolean }>("/auth/send-otp", {
			method: "POST",
			body: JSON.stringify({ email }),
		});
		s.stop("Code sent — check your inbox");

		const otp = await text({ message: "Enter the code from your email" });
		if (isCancel(otp)) {
			outro("Cancelled");
			process.exit(0);
		}

		s.start(randomLoadingMessage());
		const { token, email: confirmedEmail, userId } = await apiFetch<RegisterResponse>(
			"/auth/verify-otp",
			{ method: "POST", body: JSON.stringify({ email, otp }) },
		);
		s.stop("Verified");

		const { apiUrl } = await readConfig();
		await writeConfig({
			GUILLOTEAM_API_URL: apiUrl,
			GUILLOTEAM_TOKEN: token,
			GUILLOTEAM_USER_EMAIL: confirmedEmail,
			GUILLOTEAM_USER_ID: userId,
		});

		outro(`Welcome, ${confirmedEmail}! Your API key has been saved to ~/.guilloteam/.env`);
	},
});

type MeResponse = {
	email: string;
	userId: string;
};

const loginCommand = defineCommand({
	meta: { name: "login", description: "Save an existing API key to config" },
	async run() {
		intro("Login");

		const key = await text({
			message: "Enter your API key",
			placeholder: "gt_...",
		});
		if (isCancel(key)) {
			outro("Cancelled");
			process.exit(0);
		}

		const s = spinner();
		s.start(randomLoadingMessage());
		// Validate the key by hitting /auth/me with it directly — the key isn't
		// in config yet so we override the Authorization header manually.
		const { email, userId } = await apiFetch<MeResponse>("/auth/me", {
			headers: { Authorization: `Bearer ${key}` },
		});
		s.stop("Key validated");

		const { apiUrl } = await readConfig();
		await writeConfig({
			GUILLOTEAM_API_URL: apiUrl,
			GUILLOTEAM_TOKEN: key,
			GUILLOTEAM_USER_EMAIL: email,
			GUILLOTEAM_USER_ID: userId,
		});

		outro(`Logged in as ${email}`);
	},
});

export const authCommand = defineCommand({
	meta: { name: "auth", description: "Manage authentication" },
	subCommands: {
		register: registerCommand,
		login: loginCommand,
	},
});
