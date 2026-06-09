-- Dedup das duplicatas geradas pela corrida de double-commit do import OFX
-- ANTES de criar os índices únicos parciais. Dois tipos de duplicata:
--   1. Transações com o mesmo (user_id, external_id/fitId).
--   2. Contas (assets) com a mesma (user_id, external_account_key).
-- Em (2) NÃO somamos saldos: o saldo de conta OFX é sobrescrito a cada import
-- (não acumulativo), então somar dobraria o patrimônio (o próprio bug). Mantemos
-- a linha mais antiga, repontamos referências e removemos as duplicatas. Cada
-- statement recomputa o mapeamento via subquery para não depender de estado
-- entre statements (compatível com auto-commit).

-- (1) Transações duplicadas por fitId: mantém a mais antiga.
DELETE FROM "transactions" t
USING (
  SELECT id AS dup_id,
    row_number() OVER (PARTITION BY user_id, external_id ORDER BY created_at ASC, id ASC) AS rn
  FROM "transactions"
  WHERE external_id IS NOT NULL
) d
WHERE t.id = d.dup_id AND d.rn > 1;
--> statement-breakpoint
-- (2) Repointa transações das contas duplicadas para a conta vencedora.
UPDATE "transactions" t
SET account_id = d.keeper_id
FROM (
  SELECT id AS dup_id,
    first_value(id) OVER (PARTITION BY user_id, external_account_key ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM "assets"
  WHERE external_account_key IS NOT NULL AND deleted_at IS NULL
) d
WHERE t.account_id = d.dup_id AND d.dup_id <> d.keeper_id;
--> statement-breakpoint
-- Repointa metas vinculadas à conta duplicada (defensivo).
UPDATE "goals" g
SET linked_asset_id = d.keeper_id
FROM (
  SELECT id AS dup_id,
    first_value(id) OVER (PARTITION BY user_id, external_account_key ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM "assets"
  WHERE external_account_key IS NOT NULL AND deleted_at IS NULL
) d
WHERE g.linked_asset_id = d.dup_id AND d.dup_id <> d.keeper_id;
--> statement-breakpoint
-- Remove alocações que colidiriam no destino antes de repontar (defensivo).
DELETE FROM "asset_debt_allocations" a
USING (
  SELECT id AS dup_id,
    first_value(id) OVER (PARTITION BY user_id, external_account_key ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM "assets"
  WHERE external_account_key IS NOT NULL AND deleted_at IS NULL
) d
WHERE a.asset_id = d.dup_id AND d.dup_id <> d.keeper_id
  AND EXISTS (
    SELECT 1 FROM "asset_debt_allocations" k
    WHERE k.asset_id = d.keeper_id AND k.debt_id = a.debt_id
  );
--> statement-breakpoint
UPDATE "asset_debt_allocations" a
SET asset_id = d.keeper_id
FROM (
  SELECT id AS dup_id,
    first_value(id) OVER (PARTITION BY user_id, external_account_key ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM "assets"
  WHERE external_account_key IS NOT NULL AND deleted_at IS NULL
) d
WHERE a.asset_id = d.dup_id AND d.dup_id <> d.keeper_id;
--> statement-breakpoint
-- Remove as contas duplicadas, mantendo a mais antiga por chave externa.
DELETE FROM "assets" a
USING (
  SELECT id AS dup_id,
    first_value(id) OVER (PARTITION BY user_id, external_account_key ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM "assets"
  WHERE external_account_key IS NOT NULL AND deleted_at IS NULL
) d
WHERE a.id = d.dup_id AND d.dup_id <> d.keeper_id;
--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_user_external_uniq" ON "transactions" USING btree ("user_id","external_id") WHERE "transactions"."external_id" is not null;
--> statement-breakpoint
CREATE UNIQUE INDEX "assets_external_account_key_uniq" ON "assets" USING btree ("user_id","external_account_key") WHERE "assets"."external_account_key" is not null and "assets"."deleted_at" is null;
