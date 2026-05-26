import type { BillingInterval } from "@/domain/entities/plan.entity";

/**
 * Normalizes a subscription price to monthly recurring cents.
 * Lifetime contributes 0 to MRR (one-time, not recurring).
 */
export function monthlyCentsFor(interval: BillingInterval, priceCents: bigint): bigint {
  switch (interval) {
    case "month":
      return priceCents;
    case "year":
      return priceCents / 12n;
    case "lifetime":
      return 0n;
  }
}
