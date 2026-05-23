-- Removes the legacy `one_off` debt kind from the domain.
-- Pre-launch cleanup: it is safe to DELETE the rows (only dev/test data exists).
-- The Postgres enum value `one_off` is intentionally kept in `debt_kind` because
-- dropping an enum value in Postgres is expensive; no new code path writes it.
DELETE FROM "debts" WHERE "kind" = 'one_off';
