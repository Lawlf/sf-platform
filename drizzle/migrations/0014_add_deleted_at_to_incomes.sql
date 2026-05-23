-- Adiciona soft delete em incomes. Quando `deleted_at` e preenchido, a renda
-- some das listas, dashboard e timeline. Diferente de `is_active`, que
-- representa arquivar/reativar (visivel como historico no perfil), o soft
-- delete remove a renda da visao do usuario definitivamente. A linha e
-- mantida pra atender LGPD/auditoria.
ALTER TABLE "incomes" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incomes_user_deleted_idx" ON "incomes" ("user_id","deleted_at");
