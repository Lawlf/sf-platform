CREATE TYPE "public"."amortization_method" AS ENUM('PRICE', 'SAC');--> statement-breakpoint
CREATE TYPE "public"."debt_kind" AS ENUM('financing', 'personal_loan', 'credit_card', 'overdraft');--> statement-breakpoint
CREATE TYPE "public"."debt_status" AS ENUM('active', 'paid_off', 'written_off');--> statement-breakpoint
CREATE TYPE "public"."income_frequency" AS ENUM('monthly', 'weekly', 'one_off');--> statement-breakpoint
CREATE TABLE "debt_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debt_id" uuid NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"amount_cents" bigint NOT NULL,
	"principal_portion_cents" bigint NOT NULL,
	"interest_portion_cents" bigint NOT NULL,
	"is_extra" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"kind" "debt_kind" NOT NULL,
	"status" "debt_status" DEFAULT 'active' NOT NULL,
	"original_principal_cents" bigint NOT NULL,
	"current_balance_cents" bigint NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"expected_end_date" timestamp with time zone,
	"notes" text,
	"annual_rate_decimal" text,
	"term_months" integer,
	"amort_method" "amortization_method",
	"monthly_insurance_cents" bigint,
	"monthly_admin_fee_cents" bigint,
	"monthly_installment_cents" bigint,
	"credit_limit_cents" bigint,
	"statement_day" integer,
	"due_day" integer,
	"current_statement_cents" bigint,
	"revolving_balance_cents" bigint,
	"revolving_monthly_rate_decimal" text,
	"installment_purchases" jsonb,
	"bank_name" text,
	"overdraft_monthly_rate_decimal" text,
	"last_charge_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"frequency" "income_frequency" NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "debt_payments_debt_id_idx" ON "debt_payments" USING btree ("debt_id");--> statement-breakpoint
CREATE INDEX "debt_payments_debt_id_paid_at_idx" ON "debt_payments" USING btree ("debt_id","paid_at");--> statement-breakpoint
CREATE INDEX "debts_user_id_idx" ON "debts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "debts_user_id_status_idx" ON "debts" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "incomes_user_id_idx" ON "incomes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "incomes_user_id_active_idx" ON "incomes" USING btree ("user_id","is_active");