import { createDb } from "@guilloteam/data-ops";

const url = process.env.LIBSQL_URL;
if (!url) throw new Error("Missing LIBSQL_URL");

const db = createDb(url, process.env.LIBSQL_AUTH_TOKEN);
export { db };
