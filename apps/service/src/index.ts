import { createPostgresLearningStore } from "@guilloteam/storage-postgres";
import { createServiceApp } from "./app";

const databaseUrl = process.env.DATABASE_URL;
const ingestToken = process.env.GUILLOTEAM_INGEST_TOKEN;
const agentToken = process.env.GUILLOTEAM_AGENT_TOKEN;
if (!databaseUrl || !ingestToken || !agentToken) {
	throw new Error(
		"DATABASE_URL, GUILLOTEAM_INGEST_TOKEN, and GUILLOTEAM_AGENT_TOKEN are required.",
	);
}
const store = createPostgresLearningStore(databaseUrl);
await store.migrate();
const app = createServiceApp(store, store, { ingestToken, agentToken });

export default {
	port: Number(process.env.PORT ?? 3400),
	fetch: app.fetch,
};
