-- Seed Sabor Financeiro PRO plans (mensal, anual, vitalício)
-- Run after Stripe product + prices are created.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/seed-pro-plan.sql
--
-- Idempotent: re-running updates rows by slug.

INSERT INTO plans (
  slug,
  name,
  provider,
  provider_product_id,
  provider_price_id,
  price_cents,
  currency,
  billing_interval,
  features,
  active,
  sort_order
)
VALUES
  (
    'pro-monthly',
    'PRO Mensal',
    'stripe',
    'prod_UZEXwFAtduQ1QW',
    'price_1Ta64VDYFpy0PQa4wAJ9B0Y4',
    1990,
    'BRL',
    'month',
    '["historico_ilimitado", "simulacoes", "relatorios", "exportacao"]'::jsonb,
    true,
    10
  ),
  (
    'pro-yearly',
    'PRO Anual',
    'stripe',
    'prod_UZEXwFAtduQ1QW',
    'price_1Ta65LDYFpy0PQa4j6ng5b4e',
    19900,
    'BRL',
    'year',
    '["historico_ilimitado", "simulacoes", "relatorios", "exportacao"]'::jsonb,
    true,
    20
  ),
  (
    'pro-lifetime',
    'PRO Vitalício',
    'stripe',
    'prod_UZEXwFAtduQ1QW',
    'price_1Ta67cDYFpy0PQa4NXFBKPMC',
    49700,
    'BRL',
    'lifetime',
    '["historico_ilimitado", "simulacoes", "relatorios", "exportacao", "vitalicio"]'::jsonb,
    true,
    30
  ),
  -- Google Play (assinatura in-app no Android via TWA). provider_price_id = SKU
  -- criado no Play Console. Mapeado por findByProviderPriceId(google_play, sku).
  -- Rode este seed so DEPOIS de aplicar a migration 0073 (ADD VALUE 'google_play').
  (
    'pro-monthly-android',
    'PRO Mensal',
    'google_play',
    'pro_monthly',
    'pro_monthly',
    1990,
    'BRL',
    'month',
    '["historico_ilimitado", "simulacoes", "relatorios", "exportacao"]'::jsonb,
    true,
    11
  ),
  (
    'pro-yearly-android',
    'PRO Anual',
    'google_play',
    'pro_annual',
    'pro_annual',
    19900,
    'BRL',
    'year',
    '["historico_ilimitado", "simulacoes", "relatorios", "exportacao"]'::jsonb,
    true,
    21
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  provider = EXCLUDED.provider,
  provider_product_id = EXCLUDED.provider_product_id,
  provider_price_id = EXCLUDED.provider_price_id,
  price_cents = EXCLUDED.price_cents,
  currency = EXCLUDED.currency,
  billing_interval = EXCLUDED.billing_interval,
  features = EXCLUDED.features,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
