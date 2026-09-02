import { expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildServer } from "../src/server";

test("agents synthesize Project Noise without repository initialization", async () => {
	const requests: Array<{
		path: string;
		authorization: string;
		body?: unknown;
	}> = [];
	const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
		requests.push({
			path: new URL(String(input)).pathname,
			authorization: new Headers(init?.headers).get("authorization") ?? "",
			body: init?.body ? JSON.parse(String(init.body)) : undefined,
		});
		return Response.json({
			id: "initiative-1",
			projectId: "project-1",
			statement: "Make invitation recovery reliable",
			state: "signal",
			noiseIds: ["noise-1", "noise-2"],
			createdAt: "2026-08-29T00:00:00.000Z",
			updatedAt: "2026-08-29T00:00:00.000Z",
		});
	};

	const { server } = await buildServer({
		url: "https://guilloteam.test",
		token: "agent-token",
		fetch,
	});
	const [clientTransport, serverTransport] =
		InMemoryTransport.createLinkedPair();
	const client = new Client({ name: "test-agent", version: "0.1.0" });
	await Promise.all([
		server.connect(serverTransport),
		client.connect(clientTransport),
	]);

	const tools = await client.listTools();
	const synthesize = tools.tools.find(
		(tool) => tool.name === "synthesize_noise",
	);
	expect(synthesize?.description).toContain("provenance");
	expect(tools.tools.map((tool) => tool.name)).not.toContain(
		"graduate_initiative",
	);
	expect(tools.tools.map((tool) => tool.name)).not.toContain(
		"get_product_context",
	);
	expect(tools.tools.map((tool) => tool.name)).toContain(
		"defer_noise_synthesis",
	);
	expect(tools.tools.map((tool) => tool.name)).not.toContain(
		"record_no_op_synthesis",
	);

	const response = await client.callTool({
		name: "synthesize_noise",
		arguments: {
			projectId: "project-1",
			statement: "Make invitation recovery reliable",
			noiseIds: ["noise-1", "noise-2"],
			userId: "ben",
		},
	});
	expect(JSON.parse(response.content[0]?.text ?? "{}")).toMatchObject({
		id: "initiative-1",
		state: "signal",
		noiseIds: ["noise-1", "noise-2"],
	});
	expect(requests).toEqual([
		{
			path: "/v1/projects/project-1/initiatives/synthesize",
			authorization: "Bearer agent-token",
			body: {
				statement: "Make invitation recovery reliable",
				noiseIds: ["noise-1", "noise-2"],
				userId: "ben",
			},
		},
	]);

	await Promise.all([client.close(), server.close()]);
});

test("agents can retrieve admin's focused workspace", async () => {
	const requests: Array<{ path: string; authorization: string }> = [];
	const { server } = await buildServer({
		url: "https://guilloteam.test",
		token: "agent-token",
		userId: "admin",
		fetch: async (input, init) => {
			requests.push({
				path: new URL(String(input)).pathname + new URL(String(input)).search,
				authorization: new Headers(init?.headers).get("authorization") ?? "",
			});
			return Response.json({
				userId: "admin",
				teamId: "team-1",
				projectId: "project-1",
				updatedAt: "2026-08-30T00:00:00.000Z",
			});
		},
	});
	const [clientTransport, serverTransport] =
		InMemoryTransport.createLinkedPair();
	const client = new Client({ name: "test-agent", version: "0.1.0" });
	await Promise.all([
		server.connect(serverTransport),
		client.connect(clientTransport),
	]);

	const tools = await client.listTools();
	expect(tools.tools.map((tool) => tool.name)).toContain(
		"get_focused_workspace",
	);
	const response = await client.callTool({
		name: "get_focused_workspace",
		arguments: {},
	});
	expect(JSON.parse(response.content[0]?.text ?? "{}")).toMatchObject({
		projectId: "project-1",
	});
	expect(requests).toEqual([
		{
			path: "/v1/workspace-focus?userId=admin",
			authorization: "Bearer agent-token",
		},
	]);

	await Promise.all([client.close(), server.close()]);
});

test("agents default Project tools to admin's focused workspace", async () => {
	const requests: string[] = [];
	const { server } = await buildServer({
		url: "https://guilloteam.test",
		token: "agent-token",
		userId: "admin",
		fetch: async (input) => {
			const url = new URL(String(input));
			requests.push(`${url.pathname}${url.search}`);
			if (url.pathname === "/v1/workspace-focus") {
				return Response.json({
					userId: "admin",
					teamId: "team-1",
					projectId: "project-1",
					updatedAt: "2026-08-30T00:00:00.000Z",
				});
			}
			return Response.json({
				projectId: "project-1",
				noiseCount: 0,
				workshopCount: 0,
				queueCount: 0,
				outcomeCount: 0,
			});
		},
	});
	const [clientTransport, serverTransport] =
		InMemoryTransport.createLinkedPair();
	const client = new Client({ name: "test-agent", version: "0.1.0" });
	await Promise.all([
		server.connect(serverTransport),
		client.connect(clientTransport),
	]);

	const response = await client.callTool({
		name: "get_project_workspace",
		arguments: {},
	});
	expect(JSON.parse(response.content[0]?.text ?? "{}")).toMatchObject({
		projectId: "project-1",
	});
	expect(requests).toEqual([
		"/v1/workspace-focus?userId=admin",
		"/v1/projects/project-1/workspace",
	]);

	await Promise.all([client.close(), server.close()]);
});
