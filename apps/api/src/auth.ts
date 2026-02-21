import * as authSchema from "@guilloteam/data-ops";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { apiKey, emailOTP } from "better-auth/plugins";
import { db } from "./db";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "sqlite",
		schema: authSchema,
	}),
	plugins: [
		emailOTP({
			async sendVerificationOTP({ email, otp }) {
				// TODO: Hook in email provider
				console.log("Email:", email);
				console.log("OTP:", otp);
			},
		}),
		apiKey({
			defaultPrefix: "gt_",
		}),
	],
});
