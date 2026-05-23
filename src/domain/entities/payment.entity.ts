import type { PaymentProvider } from "./subscription.entity";

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export type PaymentMethod = "card" | "pix" | "manual";

export interface Payment {
  id: string;
  subscriptionId: string | null;
  userId: string;
  provider: PaymentProvider;
  providerPaymentId: string | null;
  amountCents: bigint;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  gatewayFeeCents: bigint | null;
  paidAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
}

export function netCents(payment: Payment): bigint {
  return payment.amountCents - (payment.gatewayFeeCents ?? 0n);
}
