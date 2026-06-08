CREATE TABLE "email_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"dedupe_key" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_sends" ADD CONSTRAINT "email_sends_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_sends_user_sent_idx" ON "email_sends" USING btree ("user_id","sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX "email_sends_dedupe_idx" ON "email_sends" USING btree ("user_id","dedupe_key") WHERE "email_sends"."dedupe_key" IS NOT NULL;