import type { PaymentProvider, Subscription } from "@/domain/entities/subscription.entity";

export interface SubscriptionRepositoryPort {
  findById(id: string): Promise<Subscription | null>;
  findByProviderSubscriptionId(
    provider: PaymentProvider,
    providerSubscriptionId: string,
  ): Promise<Subscription | null>;
  findActiveByUserId(userId: string): Promise<Subscription | null>;
  findAllByUserId(userId: string): Promise<Subscription[]>;
  countByPlanId(planId: string): Promise<number>;
  /**
   * Assinaturas cujo `endedAt` cai em [start, end). Usado pelo cron de
   * win-back pra alcançar quem saiu do Pro numa janela específica.
   */
  findEndedBetween(start: Date, end: Date): Promise<Subscription[]>;
  /** Upsert por id. Insere se novo, atualiza se existir. */
  save(sub: Subscription): Promise<void>;
}
