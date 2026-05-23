CREATE TABLE "email_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_id" text NOT NULL,
	"to_email" text NOT NULL,
	"event_type" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "email_events_email_id_idx" ON "email_events" USING btree ("email_id","event_type");--> statement-breakpoint
CREATE INDEX "email_events_to_email_idx" ON "email_events" USING btree ("to_email","event_type");