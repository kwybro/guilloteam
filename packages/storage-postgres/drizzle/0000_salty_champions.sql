CREATE TYPE "public"."evidence_confidence" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"claim" text NOT NULL,
	"confidence" "evidence_confidence" NOT NULL,
	"rationale" text,
	"intent_references" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_observations" (
	"evidence_id" uuid NOT NULL,
	"observation_id" uuid NOT NULL,
	CONSTRAINT "evidence_observations_evidence_id_observation_id_pk" PRIMARY KEY("evidence_id","observation_id")
);
--> statement-breakpoint
CREATE TABLE "observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"source" text,
	"actor_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evidence_observations" ADD CONSTRAINT "evidence_observations_evidence_id_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_observations" ADD CONSTRAINT "evidence_observations_observation_id_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."observations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evidence_observations_observation_idx" ON "evidence_observations" USING btree ("observation_id");--> statement-breakpoint
CREATE INDEX "observations_observed_at_idx" ON "observations" USING btree ("observed_at");