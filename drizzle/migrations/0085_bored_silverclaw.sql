ALTER TABLE "users" ADD COLUMN "pro_grace_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "free_kept_profile_id" uuid;--> statement-breakpoint
-- Quem já é Free e tem mais de um perfil ganha 7 dias de graça pra escolher qual
-- mantém, em vez de ser trancado de surpresa no deploy.
UPDATE "users" SET "pro_grace_until" = now() + interval '7 days'
WHERE "plan" = 'free'
  AND "pro_grace_until" IS NULL
  AND (SELECT count(*) FROM "profiles" p WHERE p."user_id" = "users"."id") > 1;