/**
 * Cloudflare Worker that orchestrates the CLI preview container.
 *
 * On incoming requests, it routes to a container instance running the
 * ghostty-web terminal server with the guillo CLI pre-installed.
 * The container sleeps after 10 minutes of inactivity to save costs.
 */
import { Container } from "@cloudflare/containers";

export class CliPreviewTerminal extends Container {
	defaultPort = 8080;
	sleepAfter = "10m";

	// Forward the preview API URL into the container environment
	override get env(): Record<string, string> {
		return {
			GUILLOTEAM_API_URL:
				(this.ctx.env as Record<string, string>).PREVIEW_API_URL ||
				"https://dev.api.guillo.team",
		};
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// Health check at the Worker level
		const url = new URL(request.url);
		if (url.pathname === "/ping") {
			return new Response("pong");
		}

		// Route all traffic (including WebSocket upgrades) to the container
		// Using a single named instance per deployment — each PR gets its own
		// Worker deployment, so one container instance per PR is sufficient.
		const id = env.CLI_PREVIEW.idFromName("terminal");
		const container = env.CLI_PREVIEW.get(id);
		return container.fetch(request);
	},
} satisfies ExportedHandler<Env>;

interface Env {
	CLI_PREVIEW: DurableObjectNamespace<CliPreviewTerminal>;
	PREVIEW_API_URL: string;
}
