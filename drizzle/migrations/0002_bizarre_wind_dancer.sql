CREATE TYPE "public"."asset_category" AS ENUM('vehicle', 'real_estate', 'investment', 'other');--> statement-breakpoint
CREATE TABLE "asset_debt_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"debt_id" uuid NOT NULL,
	"allocation_original_cents" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ada_asset_debt_uniq" UNIQUE("asset_id","debt_id")
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" "asset_category" NOT NULL,
	"label" text NOT NULL,
	"current_value_cents" bigint NOT NULL,
	"metadata" jsonb,
	"fipe_code" text,
	"fipe_last_synced_at" timestamp with time zone,
	"acquired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deactivated_at" timestamp with time zone,
	"deactivation_reason" text
);
--> statement-breakpoint
ALTER TABLE "asset_debt_allocations" ADD CONSTRAINT "asset_debt_allocations_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_debt_allocations" ADD CONSTRAINT "asset_debt_allocations_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ada_asset_idx" ON "asset_debt_allocations" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "ada_debt_idx" ON "asset_debt_allocations" USING btree ("debt_id");--> statement-breakpoint
CREATE INDEX "assets_user_id_idx" ON "assets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assets_user_id_category_idx" ON "assets" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "assets_user_id_active_idx" ON "assets" USING btree ("user_id","deactivated_at");