import type { PaymentProvider, Subscription } from "@/domain/entities/subscription.entity";

export interface SubscriptionRepository {
  findById(id: string): Promise<Subscription | null>;
  findByProviderSubscriptionId(
    provider: PaymentProvider,
    providerSubscriptionId: string,
  ): Promise<Subscription | null>;
  findActiveByUserId(userId: string): Promise<Subscription | null>;
  findAllByUserId(userId: string): Promise<Subscription[]>;
  /** Upsert por id. Insere se novo, atualiza se existir. */
  save(sub: Subscription): Promise<void>;
}
