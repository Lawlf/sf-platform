import type { Payment } from "@/domain/entities/payment.entity";

export interface AdminMetricsSummary {
  mrrCents: bigint;
  revenue30dCents: bigint;
  revenueTotalCents: bigint;
  proCount: number;
  freeCount: number;
  conversionRate: number; // proCount / (proCount + freeCount), 0 when no users
  churn30d: number;
  failedPayments30d: number;
}

export interface DailyPoint {
  day: string; // ISO date "YYYY-MM-DD"
  value: number; // cents (revenue) or count (signups)
}

export interface AdminMetricsRepository {
  getSummary(now: Date): Promise<AdminMetricsSummary>;
  getRevenueSeries(now: Date, days: number): Promise<DailyPoint[]>;
  getSignupSeries(now: Date, days: number): Promise<DailyPoint[]>;
  listRecentPayments(limit: number): Promise<Payment[]>;
}
