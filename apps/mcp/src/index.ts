#!/usr/bin/env bun
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./server";

const { server, close } = await buildServer();
process.on("exit", close);
await server.connect(new StdioServerTransport());
