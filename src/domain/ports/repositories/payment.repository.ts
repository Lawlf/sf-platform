import type { Payment } from "@/domain/entities/payment.entity";
import type { PaymentProvider } from "@/domain/entities/subscription.entity";

export interface PaymentRepositoryPort {
  findById(id: string): Promise<Payment | null>;
  findByProviderPaymentId(
    provider: PaymentProvider,
    providerPaymentId: string,
  ): Promise<Payment | null>;
  findBySubscriptionId(subscriptionId: string): Promise<Payment[]>;
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Payment[]>;
  countByUserId(userId: string): Promise<number>;
  save(payment: Payment): Promise<void>;
}
