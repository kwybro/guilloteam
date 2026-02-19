import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./db/schema";

export { eq, isNull } from "drizzle-orm";
export { projects, tasks, teams } from "./db/schema";

export const createDb = (url: string, authToken?: string) => {
	const client = createClient({ url, authToken });
	return drizzle(client, { schema });
};
