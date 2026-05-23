-- Tabela debt_amount_adjustments armazena ajustes no valor mensal de uma
-- dívida ao longo do tempo. Cada linha é "period" (faixa contínua de meses) ou
-- "override" (um único mês). Precedência ao resolver o valor de um mês:
--   override > period > valor base do debt.
CREATE TYPE "debt_amount_adjustment_kind" AS ENUM ('period', 'override');

CREATE TABLE "debt_amount_adjustments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "debt_id" UUID NOT NULL REFERENCES "debts"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "kind" "debt_amount_adjustment_kind" NOT NULL,
  "start_month" TEXT,
  "end_month" TEXT,
  "month" TEXT,
  "amount_cents" BIGINT NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "debt_amount_adjustments_period_shape" CHECK (
    (kind = 'period' AND start_month IS NOT NULL AND month IS NULL)
    OR (kind = 'override' AND month IS NOT NULL AND start_month IS NULL AND end_month IS NULL)
  ),
  CONSTRAINT "debt_amount_adjustments_non_negative" CHECK (amount_cents >= 0)
);

CREATE INDEX "debt_amount_adjustments_debt_id_idx" ON "debt_amount_adjustments" ("debt_id");
CREATE INDEX "debt_amount_adjustments_user_id_idx" ON "debt_amount_adjustments" ("user_id");
CREATE INDEX "debt_amount_adjustments_debt_id_kind_idx" ON "debt_amount_adjustments" ("debt_id", "kind");
