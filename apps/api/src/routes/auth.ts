import { eq, user } from "@guilloteam/data-ops";
import { APIError } from "better-auth/api";
import { Hono } from "hono";
import { z } from "zod";
import { auth } from "../auth";
import { db } from "../db";
import { authMiddleware, type Variables } from "../middleware/auth";

const authRoutes = new Hono<{ Variables: Variables }>();

const SendOtpBody = z.object({ email: z.email() });
const VerifyOtpBody = z.object({ email: z.email(), otp: z.string().min(1) });

// POST /auth/send-otp — request a sign-in OTP for the given email
authRoutes.post("/send-otp", async (c) => {
	const body = await c.req.json();
	const parsed = SendOtpBody.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid email" }, 400);
	}
	try {
		await auth.api.sendVerificationOTP({
			body: { email: parsed.data.email, type: "sign-in" },
		});
	} catch (err) {
		if (err instanceof APIError) {
			const isClientError = Number(err.status) >= 400 && Number(err.status) < 500;
			return c.json({ error: err.message }, isClientError ? 400 : 500);
		}
		return c.json({ error: "Failed to send OTP" }, 500);
	}
	return c.json({ success: true });
});

// POST /auth/verify-otp — verify OTP, create a long-lived API key, return it
// This chains signInEmailOTP → createApiKey server-side so the CLI never touches
// session cookies.
authRoutes.post("/verify-otp", async (c) => {
	const body = await c.req.json();
	const parsed = VerifyOtpBody.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid request" }, 400);
	}

	let sessionToken: string;
	let userEmail: string;
	let userId: string;

	try {
		const session = await auth.api.signInEmailOTP({
			body: { email: parsed.data.email, otp: parsed.data.otp },
			headers: c.req.raw.headers,
		});
		if (!session.token) {
			return c.json({ error: "Authentication failed" }, 401);
		}
		sessionToken = session.token;
		userEmail = session.user.email;
		userId = session.user.id;
	} catch (err) {
		if (err instanceof APIError) {
			const isClientError = Number(err.status) >= 400 && Number(err.status) < 500;
			return c.json({ error: err.message }, isClientError ? 400 : 500);
		}
		return c.json({ error: "Failed to verify OTP" }, 500);
	}

	try {
		const keyHeaders = new Headers(c.req.raw.headers);
		keyHeaders.set("Authorization", `Bearer ${sessionToken}`);
		const apiKey = await auth.api.createApiKey({
			body: { name: "CLI" },
			headers: keyHeaders,
		});
		return c.json({ token: apiKey.key, email: userEmail, userId }, 201);
	} catch (err) {
		if (err instanceof APIError) {
			const isClientError = Number(err.status) >= 400 && Number(err.status) < 500;
			return c.json({ error: err.message }, isClientError ? 400 : 500);
		}
		return c.json({ error: "Failed to create API key" }, 500);
	}
});

// GET /auth/me — validate the caller's API key and return their identity
authRoutes.use("/me", authMiddleware);
authRoutes.get("/me", async (c) => {
	const userId = c.get("userId");
	const [currentUser] = await db.select().from(user).where(eq(user.id, userId));
	if (!currentUser) {
		return c.json({ error: "User not found" }, 404);
	}
	return c.json({ email: currentUser.email, userId: currentUser.id });
});

export { authRoutes };
