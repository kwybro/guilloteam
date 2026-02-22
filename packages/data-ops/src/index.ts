export * from "./schemas";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

export { and, count, eq, getTableColumns, gt, inArray, isNull } from "drizzle-orm";

import * as appSchema from "./db/schema/app";
import * as authSchema from "./db/schema/auth";

export * from "./db/schema/app";
export * from "./db/schema/auth";

const schema = { ...appSchema, ...authSchema };

export const createDb = (url: string, authToken?: string) => {
	const client = createClient({ url, authToken });
	return drizzle(client, { schema });
};
