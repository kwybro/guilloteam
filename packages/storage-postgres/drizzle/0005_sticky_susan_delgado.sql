CREATE TABLE "no_op_syntheses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"rationale" text NOT NULL,
	"requested_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "no_op_synthesis_noise" (
	"no_op_synthesis_id" uuid NOT NULL,
	"noise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "no_op_synthesis_noise_no_op_synthesis_id_noise_id_pk" PRIMARY KEY("no_op_synthesis_id","noise_id")
);
--> statement-breakpoint
ALTER TABLE "no_op_syntheses" ADD CONSTRAINT "no_op_syntheses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "no_op_synthesis_noise" ADD CONSTRAINT "no_op_synthesis_noise_no_op_synthesis_id_no_op_syntheses_id_fk" FOREIGN KEY ("no_op_synthesis_id") REFERENCES "public"."no_op_syntheses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "no_op_synthesis_noise" ADD CONSTRAINT "no_op_synthesis_noise_noise_id_noise_id_fk" FOREIGN KEY ("noise_id") REFERENCES "public"."noise"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "no_op_syntheses_project_created_at_idx" ON "no_op_syntheses" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "no_op_synthesis_noise_position_idx" ON "no_op_synthesis_noise" USING btree ("no_op_synthesis_id","position");--> statement-breakpoint
CREATE INDEX "no_op_synthesis_noise_noise_idx" ON "no_op_synthesis_noise" USING btree ("noise_id");