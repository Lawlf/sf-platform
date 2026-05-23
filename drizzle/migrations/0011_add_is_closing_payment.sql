-- Adds the `is_closing_payment` flag to debt_payments so reactivateDebt can
-- unambiguously identify and undo the synthetic payment created by archiveDebt
-- when a debt is archived with `reason = 'paid_off'` and a non-zero balance.
ALTER TABLE "debt_payments" ADD COLUMN "is_closing_payment" BOOLEAN NOT NULL DEFAULT FALSE;
