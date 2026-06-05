CREATE TABLE "recurring_settlements" (
	"user_id" uuid NOT NULL,
	"debt_id" uuid NOT NULL,
	"month" date NOT NULL,
	"status" text NOT NULL,
	"created_debt_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_settlements_user_id_debt_id_month_pk" PRIMARY KEY("user_id","debt_id","month")
);
--> statement-breakpoint
ALTER TABLE "recurring_settlements" ADD CONSTRAINT "recurring_settlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_settlements" ADD CONSTRAINT "recurring_settlements_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_settlements" ADD CONSTRAINT "recurring_settlements_created_debt_id_debts_id_fk" FOREIGN KEY ("created_debt_id") REFERENCES "public"."debts"("id") ON DELETE set null ON UPDATE no action;