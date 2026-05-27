CREATE TYPE "public"."goal_funding_mode" AS ENUM('linked', 'manual');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'reached', 'archived');--> statement-breakpoint
CREATE TYPE "public"."goal_type" AS ENUM('debt_payoff', 'emergency_fund', 'savings', 'financial_independence');--> statement-breakpoint
CREATE TABLE "goal_snapshots" (
	"goal_id" uuid NOT NULL,
	"month" date NOT NULL,
	"current_cents" bigint NOT NULL,
	"target_cents" bigint NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goal_snapshots_goal_id_month_pk" PRIMARY KEY("goal_id","month")
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "goal_type" NOT NULL,
	"title" text NOT NULL,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"target_cents" bigint,
	"deadline" date,
	"linked_debt_id" uuid,
	"linked_asset_id" uuid,
	"target_months" integer,
	"funding_mode" "goal_funding_mode",
	"manual_saved_cents" bigint,
	"monthly_cost_cents" bigint,
	"real_return_pct" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "goal_snapshots" ADD CONSTRAINT "goal_snapshots_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_linked_debt_id_debts_id_fk" FOREIGN KEY ("linked_debt_id") REFERENCES "public"."debts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_linked_asset_id_assets_id_fk" FOREIGN KEY ("linked_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goals_user_idx" ON "goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "goals_user_status_idx" ON "goals" USING btree ("user_id","status");