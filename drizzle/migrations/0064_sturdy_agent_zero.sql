CREATE TYPE "public"."profile_type" AS ENUM('PF', 'PJ_MEI');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "profile_type" NOT NULL,
	"linked_profile_id" uuid,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profiles_user_id_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_type_unique" ON "profiles" USING btree ("user_id","type");
--> statement-breakpoint
INSERT INTO "profiles" ("id", "user_id", "type", "created_at", "updated_at")
SELECT gen_random_uuid(), u."id", 'PF', now(), now()
FROM "users" u
WHERE NOT EXISTS (
  SELECT 1 FROM "profiles" p WHERE p."user_id" = u."id" AND p."type" = 'PF'
);
