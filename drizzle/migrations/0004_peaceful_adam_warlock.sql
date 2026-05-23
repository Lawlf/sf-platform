CREATE TYPE "public"."expense_category" AS ENUM('housing', 'utilities', 'food', 'transport', 'health', 'leisure', 'subscriptions', 'education', 'other');--> statement-breakpoint
CREATE TYPE "public"."expense_frequency" AS ENUM('monthly', 'weekly', 'one_off');--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"frequency" "expense_frequency" NOT NULL,
	"category" "expense_category" NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_user_id_idx" ON "expenses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "expenses_user_id_active_idx" ON "expenses" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "expenses_user_id_category_idx" ON "expenses" USING btree ("user_id","category");