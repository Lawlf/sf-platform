CREATE TYPE "public"."household_share_level" AS ENUM('aggregate', 'detail');--> statement-breakpoint
CREATE TABLE "household_member_profiles" (
	"household_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"share_level" "household_share_level" DEFAULT 'aggregate' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "household_member_profiles_household_id_profile_id_pk" PRIMARY KEY("household_id","profile_id")
);
--> statement-breakpoint
ALTER TABLE "household_member_profiles" ADD CONSTRAINT "household_member_profiles_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_member_profiles" ADD CONSTRAINT "household_member_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_member_profiles" ADD CONSTRAINT "household_member_profiles_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "household_member_profiles_household_user_idx" ON "household_member_profiles" USING btree ("household_id","user_id");