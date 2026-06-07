CREATE TABLE "income_settlements" (
	"user_id" uuid NOT NULL,
	"income_id" uuid NOT NULL,
	"month" date NOT NULL,
	"status" text NOT NULL,
	"adjusted_amount_cents" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "income_settlements_user_id_income_id_month_pk" PRIMARY KEY("user_id","income_id","month")
);
--> statement-breakpoint
ALTER TABLE "income_settlements" ADD CONSTRAINT "income_settlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_settlements" ADD CONSTRAINT "income_settlements_income_id_incomes_id_fk" FOREIGN KEY ("income_id") REFERENCES "public"."incomes"("id") ON DELETE cascade ON UPDATE no action;