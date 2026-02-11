import { drizzle } from "drizzle-orm/postgres-js";
import postgres from 'postgres';
import * as schema from './db/schema';

export { tasks } from "./db/schema";

export const createDb = (connectionString: string) => {
    const client = postgres(connectionString);
    return drizzle(client, { schema })
}