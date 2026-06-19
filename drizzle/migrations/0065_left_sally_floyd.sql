ALTER TABLE "assets" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "debt_amount_adjustments" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "financial_planning_settings" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "income_settlements" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "incomes" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "investment_snapshots" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "month_closings" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "recurring_settlements" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "profile_id" uuid;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_amount_adjustments" ADD CONSTRAINT "debt_amount_adjustments_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_planning_settings" ADD CONSTRAINT "financial_planning_settings_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_settlements" ADD CONSTRAINT "income_settlements_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_snapshots" ADD CONSTRAINT "investment_snapshots_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "month_closings" ADD CONSTRAINT "month_closings_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_settlements" ADD CONSTRAINT "recurring_settlements_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_profile_id_idx" ON "assets" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "debt_amount_adjustments_profile_id_idx" ON "debt_amount_adjustments" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "debts_profile_id_idx" ON "debts" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "financial_planning_settings_profile_id_idx" ON "financial_planning_settings" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "goal_contributions_profile_id_idx" ON "goal_contributions" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "goals_profile_id_idx" ON "goals" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "income_settlements_profile_id_idx" ON "income_settlements" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "incomes_profile_id_idx" ON "incomes" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "investment_snapshots_profile_id_idx" ON "investment_snapshots" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "month_closings_profile_id_idx" ON "month_closings" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "recurring_settlements_profile_id_idx" ON "recurring_settlements" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "transactions_profile_id_idx" ON "transactions" USING btree ("profile_id");
--> statement-breakpoint
UPDATE "incomes" i SET "profile_id" = p."id"
FROM "profiles" p WHERE p."user_id" = i."user_id" AND p."type" = 'PF' AND i."profile_id" IS NULL;
--> statement-breakpoint
UPDATE "debts" t SET "profile_id" = p."id"
FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;
--> statement-breakpoint
UPDATE "debt_amount_adjustments" t SET "profile_id" = p."id"
FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;
--> statement-breakpoint
UPDATE "assets" t SET "profile_id" = p."id"
FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;
--> statement-breakpoint
UPDATE "investment_snapshots" t SET "profile_id" = p."id"
FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;
--> statement-breakpoint
UPDATE "goals" t SET "profile_id" = p."id"
FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;
--> statement-breakpoint
UPDATE "goal_contributions" t SET "profile_id" = p."id"
FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;
--> statement-breakpoint
UPDATE "month_closings" t SET "profile_id" = p."id"
FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;
--> statement-breakpoint
UPDATE "transactions" t SET "profile_id" = p."id"
FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;
--> statement-breakpoint
UPDATE "financial_planning_settings" t SET "profile_id" = p."id"
FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;
--> statement-breakpoint
UPDATE "recurring_settlements" t SET "profile_id" = p."id"
FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;
--> statement-breakpoint
UPDATE "income_settlements" t SET "profile_id" = p."id"
FROM "profiles" p WHERE p."user_id" = t."user_id" AND p."type" = 'PF' AND t."profile_id" IS NULL;
