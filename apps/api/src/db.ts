import { createDb } from "@guilloteam/data-ops";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    throw new Error("Missing DATABASE_URL environment variable")
}
const db = createDb(DATABASE_URL);

export { db }