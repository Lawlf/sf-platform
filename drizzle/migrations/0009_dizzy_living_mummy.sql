ALTER TYPE "public"."debt_kind" ADD VALUE 'recurring';--> statement-breakpoint
ALTER TYPE "public"."debt_kind" ADD VALUE 'one_off';--> statement-breakpoint
DROP TABLE "expenses" CASCADE;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "recurring_frequency" text;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "recurring_amount_cents" bigint;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "expense_category" text;--> statement-breakpoint
DROP TYPE "public"."expense_category";--> statement-breakpoint
DROP TYPE "public"."expense_frequency";