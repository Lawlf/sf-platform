-- Adiciona soft delete em assets. Quando `deleted_at` e preenchido, o ativo
-- some das listas, dashboard, timeline e patrimonio. O use case `deleteAsset`
-- faz hard delete dos sub-records (asset_debt_allocations) na mesma transacao
-- logica e marca o ativo como apagado aqui. Diferente de `deactivated_at`,
-- que mantem o ativo no historico (vendido/perdido/doado), o soft delete
-- remove definitivamente da visao do usuario. A linha e mantida pra atender
-- LGPD/auditoria.
ALTER TABLE "assets" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_user_deleted_idx" ON "assets" ("user_id","deleted_at");
