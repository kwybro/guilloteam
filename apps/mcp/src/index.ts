#!/usr/bin/env bun
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./server";

const { server } = await buildServer();
await server.connect(new StdioServerTransport());
