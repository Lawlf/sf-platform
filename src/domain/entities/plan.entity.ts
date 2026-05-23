import type { PaymentProvider } from "./subscription.entity";

export type BillingInterval = "month" | "year" | "lifetime";

export const LIFETIME_LIMIT = 10;

export interface Plan {
  id: string;
  slug: string;
  name: string;
  provider: PaymentProvider;
  providerProductId: string | null;
  providerPriceId: string | null;
  priceCents: bigint;
  currency: string;
  billingInterval: BillingInterval;
  features: string[];
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export function isPlanCheckoutReady(plan: Plan): boolean {
  return plan.active && plan.providerPriceId !== null;
}
