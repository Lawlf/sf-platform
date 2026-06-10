CREATE TABLE "crypto_price_catalog" (
	"coin_id" text PRIMARY KEY NOT NULL,
	"last_price_cents" bigint,
	"last_fetched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "crypto_price_catalog_last_fetched_idx" ON "crypto_price_catalog" USING btree ("last_fetched_at");