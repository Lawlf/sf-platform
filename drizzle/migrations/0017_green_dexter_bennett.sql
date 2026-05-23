-- Tabelas para suporte a Web Push notifications:
-- push_subscriptions: subscriptions ativas por device (uma user pode ter várias)
-- notification_preferences: switches por tipo de notificação (por user)

CREATE TABLE "push_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "user_agent" text,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);

CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");

CREATE TABLE "notification_preferences" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "push_enabled" boolean DEFAULT true NOT NULL,
  "debt_due_enabled" boolean DEFAULT true NOT NULL,
  "asset_price_enabled" boolean DEFAULT true NOT NULL,
  "monthly_summary_enabled" boolean DEFAULT true NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
