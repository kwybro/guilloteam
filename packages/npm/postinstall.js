import { writeFileSync, mkdirSync } from "node:fs";
import { chmod } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { version } = require("./package.json");

const REPO = "kwybro/guilloteam";

const ARTIFACTS = {
	darwin: { arm64: "guillo-darwin-arm64", x64: "guillo-darwin-x64" },
	linux: { arm64: "guillo-linux-arm64", x64: "guillo-linux-x64" },
};

const artifact = ARTIFACTS[process.platform]?.[process.arch];
if (!artifact) {
	console.error(`guillo: unsupported platform ${process.platform}/${process.arch}`);
	process.exit(1);
}

const url = `https://github.com/${REPO}/releases/download/v${version}/${artifact}`;
const dest = join(__dirname, "bin", "guillo-bin");

mkdirSync(join(__dirname, "bin"), { recursive: true });

console.log(`Downloading guillo v${version} for ${process.platform}/${process.arch}...`);

const response = await fetch(url);
if (!response.ok) {
	console.error(`guillo: download failed — HTTP ${response.status} from ${url}`);
	process.exit(1);
}

writeFileSync(dest, Buffer.from(await response.arrayBuffer()));
await chmod(dest, 0o755);

console.log("guillo installed successfully");
