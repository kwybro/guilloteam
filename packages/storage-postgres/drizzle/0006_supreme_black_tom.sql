CREATE TABLE "initiative_merges" (
	"surviving_initiative_id" uuid NOT NULL,
	"absorbed_initiative_id" uuid NOT NULL,
	"merged_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "initiative_merges_absorbed_initiative_id_pk" PRIMARY KEY("absorbed_initiative_id")
);
--> statement-breakpoint
CREATE TABLE "initiative_queue" (
	"initiative_id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"queued_by_user_id" text NOT NULL,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "initiatives" ADD COLUMN "merged_into_initiative_id" uuid;--> statement-breakpoint
ALTER TABLE "initiatives" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "initiative_merges" ADD CONSTRAINT "initiative_merges_surviving_initiative_id_initiatives_id_fk" FOREIGN KEY ("surviving_initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "initiative_merges" ADD CONSTRAINT "initiative_merges_absorbed_initiative_id_initiatives_id_fk" FOREIGN KEY ("absorbed_initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "initiative_queue" ADD CONSTRAINT "initiative_queue_initiative_id_initiatives_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "initiative_queue" ADD CONSTRAINT "initiative_queue_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "initiative_merges_survivor_idx" ON "initiative_merges" USING btree ("surviving_initiative_id");--> statement-breakpoint
CREATE INDEX "initiative_queue_project_position_idx" ON "initiative_queue" USING btree ("project_id","position");--> statement-breakpoint
ALTER TABLE "initiatives" ADD CONSTRAINT "initiatives_merged_into_initiative_id_initiatives_id_fk" FOREIGN KEY ("merged_into_initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE restrict ON UPDATE no action;