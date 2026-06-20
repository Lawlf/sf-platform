CREATE TYPE "public"."feedback_sentiment" AS ENUM('up', 'down');--> statement-breakpoint
CREATE TYPE "public"."feedback_status" AS ENUM('aberto', 'respondido', 'fechado');--> statement-breakpoint
CREATE TABLE "feedback_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"surface" text NOT NULL,
	"sentiment" "feedback_sentiment",
	"comment" text,
	"kind" text,
	"attachment_keys" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "feedback_status" DEFAULT 'aberto' NOT NULL,
	"admin_reply" text,
	"answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback_events" ADD CONSTRAINT "feedback_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_events_user_idx" ON "feedback_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_events_surface_idx" ON "feedback_events" USING btree ("surface","sentiment");--> statement-breakpoint
CREATE INDEX "feedback_events_status_idx" ON "feedback_events" USING btree ("status","created_at");