CREATE TABLE "investment_snapshots" (
	"user_id" uuid NOT NULL,
	"month" date NOT NULL,
	"investment_type" text NOT NULL,
	"total_value_cents" bigint NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "investment_snapshots_user_id_month_investment_type_pk" PRIMARY KEY("user_id","month","investment_type")
);
--> statement-breakpoint
ALTER TABLE "investment_snapshots" ADD CONSTRAINT "investment_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;