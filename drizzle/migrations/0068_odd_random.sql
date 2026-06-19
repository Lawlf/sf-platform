DROP INDEX "profiles_user_type_unique";--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "is_primary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_primary_unique" ON "profiles" USING btree ("user_id") WHERE "profiles"."is_primary";
--> statement-breakpoint
UPDATE "profiles" SET "is_primary" = true WHERE "type" = 'PF';