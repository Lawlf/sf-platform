import type { Payment } from "@/domain/entities/payment.entity";
import type {
  AdminMetricsSummary,
  DailyPoint,
} from "@/domain/ports/repositories/admin-metrics.repository";
import { DrizzleAdminMetricsRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-admin-metrics.repository";

function repo() {
  return new DrizzleAdminMetricsRepository();
}

export async function getAdminSummary(): Promise<AdminMetricsSummary> {
  return repo().getSummary(new Date());
}

export async function getAdminSeries(
  days = 30,
): Promise<{ revenue: DailyPoint[]; signups: DailyPoint[] }> {
  const now = new Date();
  const r = repo();
  const [revenue, signups] = await Promise.all([
    r.getRevenueSeries(now, days),
    r.getSignupSeries(now, days),
  ]);
  return { revenue, signups };
}

export async function getRecentPayments(limit = 20): Promise<Payment[]> {
  return repo().listRecentPayments(limit);
}
