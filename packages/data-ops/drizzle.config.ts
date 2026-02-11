import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    throw new Error("Missing DATABASE_URL environment variable")
}

export default defineConfig({
    out: './drizzle',
    schema: './src/db/schema.ts',
    dialect: 'postgresql',
    dbCredentials: {
        url: DATABASE_URL
    }
});
