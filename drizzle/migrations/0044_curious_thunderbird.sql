CREATE TABLE "month_closings" (
	"user_id" uuid NOT NULL,
	"month" date NOT NULL,
	"baseline_net_worth_cents" bigint NOT NULL,
	"end_net_worth_cents" bigint NOT NULL,
	"theoretical_free_cash_flow_cents" bigint NOT NULL,
	"leak_cents" bigint NOT NULL,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "month_closings_user_id_month_pk" PRIMARY KEY("user_id","month")
);
--> statement-breakpoint
ALTER TABLE "month_closings" ADD CONSTRAINT "month_closings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;