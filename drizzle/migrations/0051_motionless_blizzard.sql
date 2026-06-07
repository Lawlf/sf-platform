ALTER TABLE "month_closings" ADD COLUMN "end_debt_balance_cents" bigint;--> statement-breakpoint
ALTER TABLE "month_closings" ADD COLUMN "end_reserve_cents" bigint;--> statement-breakpoint
ALTER TABLE "month_closings" ADD COLUMN "committed_pct_bps" integer;