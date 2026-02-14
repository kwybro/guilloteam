import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./db/schema";

export { eq, isNull } from "drizzle-orm";
export { projects, tasks, teams } from "./db/schema";

export const createDb = (connectionString: string) => {
	const client = postgres(connectionString);
	return drizzle(client, { schema });
};
