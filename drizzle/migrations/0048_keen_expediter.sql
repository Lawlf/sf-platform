ALTER TABLE "transactions" ADD COLUMN "direction" text DEFAULT 'out' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "status" text DEFAULT 'paid' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_assets_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_account_idx" ON "transactions" USING btree ("account_id");