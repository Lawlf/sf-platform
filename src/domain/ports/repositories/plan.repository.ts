import type { Plan } from "@/domain/entities/plan.entity";
import type { PaymentProvider } from "@/domain/entities/subscription.entity";

export interface PlanRepositoryPort {
  findById(id: string): Promise<Plan | null>;
  findBySlug(slug: string): Promise<Plan | null>;
  findByProviderPriceId(
    provider: PaymentProvider,
    providerPriceId: string,
  ): Promise<Plan | null>;
  findActive(): Promise<Plan[]>;
}
