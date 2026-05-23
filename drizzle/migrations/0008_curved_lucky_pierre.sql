ALTER TABLE "assets" ADD COLUMN "purchase_price_cents" bigint;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "deactivation_kind" text;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "sale_price_cents" bigint;