CREATE TYPE "public"."profile_tax_classification" AS ENUM('mei', 'manual');--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "tax_classification" "profile_tax_classification";--> statement-breakpoint
UPDATE "profiles" SET "tax_classification" = 'mei' WHERE "type" = 'PJ_MEI';