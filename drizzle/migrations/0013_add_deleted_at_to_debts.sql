-- Adiciona soft delete em debts. Quando `deleted_at` é preenchido, a dívida
-- some das listas, dashboard e timeline. O use case `deleteDebt` faz hard
-- delete dos sub-records (debt_payments, asset_debt_allocations) na mesma
-- transação lógica e marca a dívida como deletada aqui.
ALTER TABLE "debts" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "debts_user_deleted_idx" ON "debts" ("user_id","deleted_at");
