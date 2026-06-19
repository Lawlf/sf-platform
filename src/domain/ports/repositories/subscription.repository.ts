import type { PaymentProvider, Subscription } from "@/domain/entities/subscription.entity";

export interface SubscriptionRepositoryPort {
  findById(id: string): Promise<Subscription | null>;
  findByProviderSubscriptionId(
    provider: PaymentProvider,
    providerSubscriptionId: string,
  ): Promise<Subscription | null>;
  findActiveByUserId(userId: string): Promise<Subscription | null>;
  /**
   * Assinaturas de um provider ainda em estado vivo (não canceladas/expiradas).
   * Usado pelo cron de reconciliação do Google Play pra revalidar cada uma na API.
   */
  findLiveByProvider(provider: PaymentProvider): Promise<Subscription[]>;
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
