ALTER TABLE "initiatives" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "initiatives" ADD COLUMN "completed_by_user_id" text;--> statement-breakpoint
ALTER TABLE "initiatives" ADD COLUMN "outcome_summary" text;