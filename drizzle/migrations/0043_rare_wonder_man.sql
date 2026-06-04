CREATE TYPE "public"."goal_cascade_mode" AS ENUM('queue', 'parallel');--> statement-breakpoint
CREATE TABLE "financial_planning_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"liquid_bucket_asset_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "cascade_order" integer;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "cascade_mode" "goal_cascade_mode";--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "cascade_parallel_pct" numeric;--> statement-breakpoint
ALTER TABLE "financial_planning_settings" ADD CONSTRAINT "financial_planning_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_planning_settings" ADD CONSTRAINT "financial_planning_settings_liquid_bucket_asset_id_assets_id_fk" FOREIGN KEY ("liquid_bucket_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;