-- Dedup das Carteiras padrão duplicadas (corrida de check-then-insert no
-- ensureDefaultWallet / resolveAccount) ANTES de criar o índice único parcial.
-- Mantém a Carteira mais antiga por usuário, repointa referências, soma saldos
-- e remove as duplicatas. Cada statement recomputa o mapeamento via CTE para
-- não depender de estado entre statements (compatível com auto-commit).

UPDATE "transactions" t
SET account_id = d.keeper_id
FROM (
  SELECT id AS dup_id,
    first_value(id) OVER (PARTITION BY user_id ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM "assets"
  WHERE category = 'cash' AND label = 'Carteira' AND deleted_at IS NULL AND deactivated_at IS NULL
) d
WHERE t.account_id = d.dup_id AND d.dup_id <> d.keeper_id;
--> statement-breakpoint
UPDATE "goals" g
SET linked_asset_id = d.keeper_id
FROM (
  SELECT id AS dup_id,
    first_value(id) OVER (PARTITION BY user_id ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM "assets"
  WHERE category = 'cash' AND label = 'Carteira' AND deleted_at IS NULL AND deactivated_at IS NULL
) d
WHERE g.linked_asset_id = d.dup_id AND d.dup_id <> d.keeper_id;
--> statement-breakpoint
UPDATE "financial_planning_settings" f
SET liquid_bucket_asset_id = d.keeper_id
FROM (
  SELECT id AS dup_id,
    first_value(id) OVER (PARTITION BY user_id ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM "assets"
  WHERE category = 'cash' AND label = 'Carteira' AND deleted_at IS NULL AND deactivated_at IS NULL
) d
WHERE f.liquid_bucket_asset_id = d.dup_id AND d.dup_id <> d.keeper_id;
--> statement-breakpoint
DELETE FROM "asset_debt_allocations" a
USING (
  SELECT id AS dup_id,
    first_value(id) OVER (PARTITION BY user_id ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM "assets"
  WHERE category = 'cash' AND label = 'Carteira' AND deleted_at IS NULL AND deactivated_at IS NULL
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
    first_value(id) OVER (PARTITION BY user_id ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM "assets"
  WHERE category = 'cash' AND label = 'Carteira' AND deleted_at IS NULL AND deactivated_at IS NULL
) d
WHERE a.asset_id = d.dup_id AND d.dup_id <> d.keeper_id;
--> statement-breakpoint
UPDATE "assets" k
SET current_value_cents = k.current_value_cents + agg.sum_cents
FROM (
  SELECT d.keeper_id, SUM(a.current_value_cents) AS sum_cents
  FROM (
    SELECT id AS dup_id,
      first_value(id) OVER (PARTITION BY user_id ORDER BY created_at ASC, id ASC) AS keeper_id
    FROM "assets"
    WHERE category = 'cash' AND label = 'Carteira' AND deleted_at IS NULL AND deactivated_at IS NULL
  ) d
  JOIN "assets" a ON a.id = d.dup_id
  WHERE d.dup_id <> d.keeper_id
  GROUP BY d.keeper_id
) agg
WHERE k.id = agg.keeper_id;
--> statement-breakpoint
DELETE FROM "assets" a
USING (
  SELECT id AS dup_id,
    first_value(id) OVER (PARTITION BY user_id ORDER BY created_at ASC, id ASC) AS keeper_id
  FROM "assets"
  WHERE category = 'cash' AND label = 'Carteira' AND deleted_at IS NULL AND deactivated_at IS NULL
) d
WHERE a.id = d.dup_id AND d.dup_id <> d.keeper_id;
--> statement-breakpoint
CREATE UNIQUE INDEX "assets_default_wallet_uniq" ON "assets" USING btree ("user_id") WHERE "assets"."category" = 'cash' and "assets"."label" = 'Carteira' and "assets"."deleted_at" is null and "assets"."deactivated_at" is null;
