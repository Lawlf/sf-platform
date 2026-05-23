CREATE TABLE "stock_catalog" (
	"ticker" text PRIMARY KEY NOT NULL,
	"company_name" text,
	"last_price_cents" bigint,
	"last_fetched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "stock_catalog_last_fetched_idx" ON "stock_catalog" USING btree ("last_fetched_at");