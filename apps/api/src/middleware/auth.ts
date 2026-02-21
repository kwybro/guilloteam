import type { Context, Next } from "hono";
import { auth } from "../auth";

export type Variables = {
	userId: string;
};

export const authMiddleware = async (
	c: Context<{ Variables: Variables }>,
	next: Next,
) => {
    // 1. Extract key from header
	const authHeader = c.req.header("Authorization");
	const key = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
	if (!key) {
		return c.json({ error: "Unauthorized" }, 401);
	}

    // 2. Verify api key
	const data = await auth.api.verifyApiKey({ body: { key } });
	if (!data.valid || !data.key) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	c.set("userId", data.key.userId);
	await next();
};
