import * as authSchema from "@guilloteam/data-ops";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { apiKey, bearer, emailOTP } from "better-auth/plugins";
import { db } from "./db";
import { sendOTP } from "./email";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "sqlite",
		schema: authSchema,
	}),
	plugins: [
		bearer(),
		emailOTP({
			async sendVerificationOTP({ email, otp }) {
				await sendOTP(email, otp);
			},
		}),
		apiKey({
			defaultPrefix: "gt_",
		}),
	],
});
