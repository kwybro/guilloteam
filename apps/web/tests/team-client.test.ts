import { expect, test } from "bun:test";
import { createTeamClient } from "../src/project-client";

test("loads a user's Teams and Projects and creates a Project through the API", async () => {
	const requests: Array<{ path: string; method: string }> = [];
	const client = createTeamClient({
		userId: "ava",
		token: "user-token",
		fetch: async (input, init) => {
			const url = new URL(String(input), "http://web.test");
			requests.push({
				path: `${url.pathname}${url.search}`,
				method: init?.method ?? "GET",
			});
			return Response.json([]);
		},
	});

	await client.listTeams();
	await client.listProjects("team-1");
	await client.createProject("team-1", "Website");
	await client.setWorkspaceFocus("team-1", "project-1");

	expect(requests).toEqual([
		{ path: "/v1/teams?userId=ava", method: "GET" },
		{ path: "/v1/teams/team-1/projects?userId=ava", method: "GET" },
		{ path: "/v1/teams/team-1/projects", method: "POST" },
		{ path: "/v1/workspace-focus", method: "PUT" },
	]);
});
