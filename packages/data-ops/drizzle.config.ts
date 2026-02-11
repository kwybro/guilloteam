import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const isLocal = process.env.ENV === "local";

const localDb = {
    dbCredentials: {
        url: "../../apps/api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/d7e7dad26bda2eb41e10f2b5b0776873c53023ab37e537e0aca2622a0a57c851.sqlite"
    }
};

const remoteDb = {
    driver: 'd1-http',
    dbCredentials: {
        // biome-ignore lint/style/noNonNullAssertion: Will fail early
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
        // biome-ignore lint/style/noNonNullAssertion: Will fail early
        databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
        // biome-ignore lint/style/noNonNullAssertion: Will fail early
        token: process.env.CLOUDFLARE_D1_TOKEN!,
    },
}

export default defineConfig({
    out: './drizzle',
    schema: './src/db/schema.ts',
    dialect: 'sqlite',
    ...(isLocal ? localDb : remoteDb)
});
