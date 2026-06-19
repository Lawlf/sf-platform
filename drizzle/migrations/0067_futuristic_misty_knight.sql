CREATE TABLE "mei_monthly" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"competencia" date NOT NULL,
	"pro_labore_cents" bigint NOT NULL,
	"gasto_pessoal_pj_cents" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mei_monthly" ADD CONSTRAINT "mei_monthly_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mei_monthly_profile_competencia_uniq" ON "mei_monthly" USING btree ("profile_id","competencia");--> statement-breakpoint
CREATE INDEX "mei_monthly_profile_id_idx" ON "mei_monthly" USING btree ("profile_id");