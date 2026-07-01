"use server";

import type { BillingInterval } from "@/domain/entities/plan.entity";
import { CURRENCIES, type Currency } from "@/domain/value-objects/money.vo";
import { getStripeClient } from "@/infrastructure/billing/stripe/stripe-client";
import { requireAdmin } from "@/presentation/http/middleware/cached-current-user";
import { isAdminElevated } from "@/presentation/http/middleware/require-elevated-admin";

export interface StripePriceLookup {
  providerProductId: string;
  providerPriceId: string;
  priceCents: string;
  currency: Currency;
  billingInterval: BillingInterval;
  nickname: string | null;
}

export interface LookupResult {
  ok: boolean;
  message?: string;
  data?: StripePriceLookup;
}

function isCurrency(v: string): v is Currency {
  return (CURRENCIES as readonly string[]).includes(v);
}

export async function lookupStripePriceAction(priceId: string): Promise<LookupResult> {
  const admin = await requireAdmin();
  if (!(await isAdminElevated(admin.id)))
    return { ok: false, message: "Elevação necessária. Desbloqueie o painel para continuar." };

  const id = priceId.trim();
  if (id.length === 0) return { ok: false, message: "Informe o Price ID da Stripe." };

  const price = await getStripeClient()
    .prices.retrieve(id, { expand: ["product"] })
    .catch(() => null);
  if (!price) return { ok: false, message: "Price ID não encontrado na Stripe." };

  if (price.unit_amount === null) {
    return { ok: false, message: "Esse preço não tem valor fixo (precificação variável não suportada)." };
  }

  const currency = price.currency.toUpperCase();
  if (!isCurrency(currency)) return { ok: false, message: `Moeda "${currency}" não suportada.` };

  const billingInterval: BillingInterval | null = price.recurring
    ? price.recurring.interval === "month"
      ? "month"
      : price.recurring.interval === "year"
        ? "year"
        : null
    : price.type === "one_time"
      ? "lifetime"
      : null;
  if (!billingInterval) {
    return {
      ok: false,
      message: "Intervalo não suportado (use recorrência mensal, anual, ou pagamento único pro vitalício).",
    };
  }

  const providerProductId =
    typeof price.product === "string" ? price.product : price.product.id;

  return {
    ok: true,
    data: {
      providerProductId,
      providerPriceId: price.id,
      priceCents: price.unit_amount.toString(),
      currency,
      billingInterval,
      nickname: price.nickname,
    },
  };
}
