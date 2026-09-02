CREATE TABLE "workspace_focuses" (
	"user_id" text PRIMARY KEY NOT NULL,
	"team_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_focuses" ADD CONSTRAINT "workspace_focuses_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_focuses" ADD CONSTRAINT "workspace_focuses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_focuses_project_idx" ON "workspace_focuses" USING btree ("project_id");