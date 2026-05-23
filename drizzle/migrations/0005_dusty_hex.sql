CREATE TYPE "public"."depreciation_kind" AS ENUM('appreciating', 'stable', 'depreciating', 'consumable');--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "depreciation_kind" "depreciation_kind" DEFAULT 'stable' NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "depreciation_rate_pct_year" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "purchase_date" timestamp with time zone;