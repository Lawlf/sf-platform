CREATE TABLE "debt_due_acknowledgements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"debt_id" uuid NOT NULL,
	"cycle_iso" text NOT NULL,
	"response" text NOT NULL,
	"responded_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debt_due_ack_debt_cycle_unique" UNIQUE("debt_id","cycle_iso")
);
--> statement-breakpoint
ALTER TABLE "debt_due_acknowledgements" ADD CONSTRAINT "debt_due_acknowledgements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_due_acknowledgements" ADD CONSTRAINT "debt_due_acknowledgements_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "debt_due_ack_user_idx" ON "debt_due_acknowledgements" USING btree ("user_id");