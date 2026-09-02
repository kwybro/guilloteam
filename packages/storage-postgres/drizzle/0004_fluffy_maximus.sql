CREATE TYPE "public"."initiative_state" AS ENUM('signal', 'queued', 'executing', 'completed');--> statement-breakpoint
CREATE TABLE "initiative_noise" (
	"initiative_id" uuid NOT NULL,
	"noise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "initiative_noise_initiative_id_noise_id_pk" PRIMARY KEY("initiative_id","noise_id")
);
--> statement-breakpoint
CREATE TABLE "initiatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"statement" text NOT NULL,
	"state" "initiative_state" DEFAULT 'signal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "initiative_noise" ADD CONSTRAINT "initiative_noise_initiative_id_initiatives_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "initiative_noise" ADD CONSTRAINT "initiative_noise_noise_id_noise_id_fk" FOREIGN KEY ("noise_id") REFERENCES "public"."noise"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "initiatives" ADD CONSTRAINT "initiatives_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "initiative_noise_initiative_position_idx" ON "initiative_noise" USING btree ("initiative_id","position");--> statement-breakpoint
CREATE INDEX "initiative_noise_noise_idx" ON "initiative_noise" USING btree ("noise_id");--> statement-breakpoint
CREATE INDEX "initiatives_project_state_created_at_idx" ON "initiatives" USING btree ("project_id","state","created_at");