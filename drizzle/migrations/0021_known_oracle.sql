CREATE TYPE "public"."content_diagnostic_answer" AS ENUM('pagar-divida', 'guardar', 'investir');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "content_diagnostic_answer" "content_diagnostic_answer";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "content_diagnostic_answered_at" timestamp with time zone;