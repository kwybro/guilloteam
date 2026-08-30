ALTER TABLE "initiatives" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "initiatives" ADD COLUMN "started_by_user_id" text;