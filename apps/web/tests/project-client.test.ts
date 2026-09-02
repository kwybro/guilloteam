import { expect, test } from "bun:test";
import { createProjectClient } from "../src/project-client";

test("loads a Project's lifecycle tabs and uses user-only commands", async () => {
	const requests: Array<{
		path: string;
		authorization: string;
		method: string;
	}> = [];
	const client = createProjectClient({
		projectId: "project-1",
		userId: "ava",
		token: "user-token",
		fetch: async (input, init) => {
			requests.push({
				path: new URL(String(input), "http://web.test").pathname,
				authorization: new Headers(init?.headers).get("authorization") ?? "",
				method: init?.method ?? "GET",
			});
			return Response.json([]);
		},
	});

	await client.loadWorkspace();
	await client.captureNoise({
		content: "Invitation links should survive expired sessions.",
		source: "fleeting_thought",
	});
	await client.graduateInitiative("initiative-1");
	await client.startNextInitiative();

	expect(requests).toEqual([
		{
			path: "/v1/projects/project-1/workspace",
			authorization: "Bearer user-token",
			method: "GET",
		},
		{
			path: "/v1/projects/project-1/noise",
			authorization: "Bearer user-token",
			method: "GET",
		},
		{
			path: "/v1/projects/project-1/workshop",
			authorization: "Bearer user-token",
			method: "GET",
		},
		{
			path: "/v1/projects/project-1/queue",
			authorization: "Bearer user-token",
			method: "GET",
		},
		{
			path: "/v1/projects/project-1/noise",
			authorization: "Bearer user-token",
			method: "POST",
		},
		{
			path: "/v1/projects/project-1/initiatives/initiative-1/graduate",
			authorization: "Bearer user-token",
			method: "POST",
		},
		{
			path: "/v1/projects/project-1/queue/start-next",
			authorization: "Bearer user-token",
			method: "POST",
		},
	]);
});
