ALTER TABLE "user_credentials" ADD COLUMN "pin_hash" text;
ALTER TABLE "user_credentials" ADD COLUMN "app_lock_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "user_credentials" ADD COLUMN "app_lock_timeout" integer DEFAULT 60 NOT NULL;
