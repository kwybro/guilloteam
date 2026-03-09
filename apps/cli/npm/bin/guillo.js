#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const binary = join(__dirname, "guillo-bin");

const { status } = spawnSync(binary, process.argv.slice(2), { stdio: "inherit" });
process.exit(status ?? 1);
