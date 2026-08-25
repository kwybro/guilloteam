CREATE TYPE "public"."queue_item_readiness" AS ENUM('not_ready', 'ready');--> statement-breakpoint
CREATE TYPE "public"."queue_item_status" AS ENUM('queued', 'in_progress', 'done');--> statement-breakpoint
CREATE TABLE "inputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queue_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"queue_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"position" integer NOT NULL,
	"readiness" "queue_item_readiness" DEFAULT 'not_ready' NOT NULL,
	"status" "queue_item_status" DEFAULT 'queued' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"completion_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queue_item_inputs" (
	"queue_item_id" uuid NOT NULL,
	"input_id" uuid NOT NULL,
	CONSTRAINT "queue_item_inputs_queue_item_id_input_id_pk" PRIMARY KEY("queue_item_id", "input_id")
);
--> statement-breakpoint
ALTER TABLE "queue_items" ADD CONSTRAINT "queue_items_queue_id_queues_id_fk" FOREIGN KEY ("queue_id") REFERENCES "public"."queues"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_item_inputs" ADD CONSTRAINT "queue_item_inputs_queue_item_id_queue_items_id_fk" FOREIGN KEY ("queue_item_id") REFERENCES "public"."queue_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_item_inputs" ADD CONSTRAINT "queue_item_inputs_input_id_inputs_id_fk" FOREIGN KEY ("input_id") REFERENCES "public"."inputs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inputs_created_at_idx" ON "inputs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "queues_created_at_idx" ON "queues" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "queue_items_queue_position_idx" ON "queue_items" USING btree ("queue_id", "position");--> statement-breakpoint
CREATE INDEX "queue_items_queue_status_idx" ON "queue_items" USING btree ("queue_id", "status", "readiness");--> statement-breakpoint
CREATE INDEX "queue_item_inputs_input_idx" ON "queue_item_inputs" USING btree ("input_id");
