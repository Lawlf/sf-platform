import type { BillingInterval, Plan } from "@/domain/entities/plan.entity";
import type { PaymentProvider } from "@/domain/entities/subscription.entity";

export interface NewPlan {
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
}

export interface PlanRepositoryPort {
  findById(id: string): Promise<Plan | null>;
  findBySlug(slug: string): Promise<Plan | null>;
  findByProviderPriceId(
    provider: PaymentProvider,
    providerPriceId: string,
  ): Promise<Plan | null>;
  findActive(): Promise<Plan[]>;
  findAll(): Promise<Plan[]>;
  create(input: NewPlan): Promise<Plan>;
  setActive(id: string, active: boolean): Promise<void>;
}
