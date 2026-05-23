CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"month_iso" text,
	"triggered_at" timestamp with time zone NOT NULL,
	"payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" ("user_id","dismissed_at");
--> statement-breakpoint
CREATE INDEX "notifications_user_kind_month_idx" ON "notifications" ("user_id","kind","month_iso");
