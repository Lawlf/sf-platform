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

export interface AcquisitionBreakdown {
  byChannel: { channel: string; count: number }[];
  unanswered: number; // never asked or skipped the wizard step
  otherDetails: string[]; // free text from the "other" chip
}

export interface AdminMetricsRepositoryPort {
  getSummary(now: Date): Promise<AdminMetricsSummary>;
  getRevenueSeries(now: Date, days: number): Promise<DailyPoint[]>;
  getSignupSeries(now: Date, days: number): Promise<DailyPoint[]>;
  getAcquisitionBreakdown(): Promise<AcquisitionBreakdown>;
  listRecentPayments(limit: number): Promise<Payment[]>;
}
