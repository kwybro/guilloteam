import { drizzle } from "drizzle-orm/d1";

export { tasks } from "./db/schema";

export const createDb = (d1: D1Database) => drizzle(d1);