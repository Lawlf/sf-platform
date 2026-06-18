UPDATE "incomes" t SET "profile_id" = p."id" FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;--> statement-breakpoint
UPDATE "debts" t SET "profile_id" = p."id" FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;--> statement-breakpoint
UPDATE "debt_amount_adjustments" t SET "profile_id" = p."id" FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;--> statement-breakpoint
UPDATE "assets" t SET "profile_id" = p."id" FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;--> statement-breakpoint
UPDATE "investment_snapshots" t SET "profile_id" = p."id" FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;--> statement-breakpoint
UPDATE "goals" t SET "profile_id" = p."id" FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;--> statement-breakpoint
UPDATE "goal_contributions" t SET "profile_id" = p."id" FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;--> statement-breakpoint
UPDATE "month_closings" t SET "profile_id" = p."id" FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;--> statement-breakpoint
UPDATE "transactions" t SET "profile_id" = p."id" FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;--> statement-breakpoint
UPDATE "financial_planning_settings" t SET "profile_id" = p."id" FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;--> statement-breakpoint
UPDATE "recurring_settlements" t SET "profile_id" = p."id" FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;--> statement-breakpoint
UPDATE "income_settlements" t SET "profile_id" = p."id" FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;--> statement-breakpoint
DROP INDEX "transactions_user_external_uniq";--> statement-breakpoint
DROP INDEX "assets_default_wallet_uniq";--> statement-breakpoint
DROP INDEX "assets_external_account_key_uniq";--> statement-breakpoint
ALTER TABLE "income_settlements" DROP CONSTRAINT "income_settlements_user_id_income_id_month_pk";--> statement-breakpoint
ALTER TABLE "investment_snapshots" DROP CONSTRAINT "investment_snapshots_user_id_month_investment_type_pk";--> statement-breakpoint
ALTER TABLE "month_closings" DROP CONSTRAINT "month_closings_user_id_month_pk";--> statement-breakpoint
ALTER TABLE "recurring_settlements" DROP CONSTRAINT "recurring_settlements_user_id_debt_id_month_pk";--> statement-breakpoint
ALTER TABLE "financial_planning_settings" DROP CONSTRAINT "financial_planning_settings_pkey";--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "profile_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "debt_amount_adjustments" ALTER COLUMN "profile_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "debts" ALTER COLUMN "profile_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_planning_settings" ADD PRIMARY KEY ("profile_id");--> statement-breakpoint
ALTER TABLE "financial_planning_settings" ALTER COLUMN "profile_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "goal_contributions" ALTER COLUMN "profile_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "profile_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "income_settlements" ALTER COLUMN "profile_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "incomes" ALTER COLUMN "profile_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "investment_snapshots" ALTER COLUMN "profile_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "month_closings" ALTER COLUMN "profile_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "recurring_settlements" ALTER COLUMN "profile_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "profile_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "income_settlements" ADD CONSTRAINT "income_settlements_profile_id_income_id_month_pk" PRIMARY KEY("profile_id","income_id","month");--> statement-breakpoint
ALTER TABLE "investment_snapshots" ADD CONSTRAINT "investment_snapshots_profile_id_month_investment_type_pk" PRIMARY KEY("profile_id","month","investment_type");--> statement-breakpoint
ALTER TABLE "month_closings" ADD CONSTRAINT "month_closings_profile_id_month_pk" PRIMARY KEY("profile_id","month");--> statement-breakpoint
ALTER TABLE "recurring_settlements" ADD CONSTRAINT "recurring_settlements_profile_id_debt_id_month_pk" PRIMARY KEY("profile_id","debt_id","month");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_profile_external_uniq" ON "transactions" USING btree ("profile_id","external_id") WHERE "transactions"."external_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "assets_default_wallet_uniq" ON "assets" USING btree ("profile_id") WHERE "assets"."category" = 'cash' and "assets"."label" = 'Carteira' and "assets"."deleted_at" is null and "assets"."deactivated_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "assets_external_account_key_uniq" ON "assets" USING btree ("profile_id","external_account_key") WHERE "assets"."external_account_key" is not null and "assets"."deleted_at" is null;
