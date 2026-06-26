ALTER TABLE "financial_planning_settings" ADD COLUMN "free_balance_accumulated_cents" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_planning_settings" ADD COLUMN "committed_covered_cents" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_planning_settings" ADD COLUMN "current_bucket_month" text;