import { defineConfig } from "drizzle-kit";

const url = process.env.LIBSQL_URL;
if (!url) throw new Error("Missing LIBSQL_URL");

export default defineConfig({
	out: "./drizzle",
	schema: "./src/db/schema",
	dialect: "turso",
	dbCredentials: {
		url,
		authToken: process.env.LIBSQL_AUTH_TOKEN,
	},
});
