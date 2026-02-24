import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) throw new Error("Missing RESEND_API_KEY");

const resend = new Resend(apiKey);

export async function sendOTP(email: string, otp: string): Promise<void> {
	await resend.emails.send({
		from: "guilloteam <noreply@guillo.team>",
		to: email,
		subject: "Your guilloteam verification code",
		html: `
			<div style="font-family: monospace; background: #0a0a0a; color: #f5f5f5; padding: 32px; border-radius: 8px;">
				<p style="margin: 0 0 16px;">Your verification code:</p>
				<p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 0 0 16px;">${otp}</p>
				<p style="margin: 0; color: #888; font-size: 12px;">Expires in 10 minutes. If you didn't request this, ignore it.</p>
			</div>
		`,
	});
}
