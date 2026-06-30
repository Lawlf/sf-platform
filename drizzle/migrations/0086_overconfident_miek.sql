ALTER TABLE "debts" ADD COLUMN "payroll_deducted" boolean;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "linked_income_id" uuid;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_linked_income_id_incomes_id_fk" FOREIGN KEY ("linked_income_id") REFERENCES "public"."incomes"("id") ON DELETE set null ON UPDATE no action;