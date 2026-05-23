CREATE TYPE "public"."billing_interval" AS ENUM('month', 'year');--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_product_id" text,
	"provider_price_id" text,
	"price_cents" bigint NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"billing_interval" "billing_interval" NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "plan_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "plans_slug_idx" ON "plans" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_provider_price_id_idx" ON "plans" USING btree ("provider","provider_price_id") WHERE "plans"."provider_price_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "plans_active_idx" ON "plans" USING btree ("active");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscriptions_plan_idx" ON "subscriptions" USING btree ("plan_id");