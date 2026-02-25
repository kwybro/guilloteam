import {
	account,
	apikey,
	memberships,
	session,
	teams,
	user,
	verification,
} from "@guilloteam/data-ops";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { apiKey, bearer, emailOTP } from "better-auth/plugins";
import { db } from "./db";
import { sendOTP } from "./email";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "sqlite",
		schema: { user, session, account, verification, apikey },
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
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					await db.transaction(async (tx) => {
						const [team] = await tx.insert(teams).values({ name: "Personal" }).returning();
						if (!team) {
							throw new Error("Could not create Personal team");
						}
						await tx
							.insert(memberships)
							.values({ userId: user.id, teamId: team.id, role: "owner" });
					});
				},
			},
		},
	},
});
