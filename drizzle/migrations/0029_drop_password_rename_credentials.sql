ALTER TABLE "admin_credentials" DROP COLUMN IF EXISTS "password_hash";
ALTER TABLE "admin_credentials" RENAME TO "user_credentials";
