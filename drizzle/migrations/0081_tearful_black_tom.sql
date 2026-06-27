CREATE TABLE "asset_cost_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"category_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "acc_profile_category_uniq" UNIQUE("profile_id","category_key")
);
--> statement-breakpoint
ALTER TABLE "asset_cost_categories" ADD CONSTRAINT "asset_cost_categories_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_cost_categories" ADD CONSTRAINT "asset_cost_categories_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "acc_asset_idx" ON "asset_cost_categories" USING btree ("asset_id");