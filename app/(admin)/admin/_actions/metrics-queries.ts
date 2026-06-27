import { unstable_cache } from "next/cache";


import type { Payment } from "@/domain/entities/payment.entity";
import type {
  AcquisitionBreakdown,
  AdminMetricsSummary,
  DailyPoint,
} from "@/domain/ports/repositories/admin-metrics.repository";
import { repos } from "@/infrastructure/container";

/**
 * The admin summary runs ~7 aggregate scans (SUM/COUNT over payments,
 * subscriptions, users) on every dashboard load. Cache it for 60s, tagged
 * `admin-metrics` so a mutation can `revalidateTag(ADMIN_METRICS_TAG)`.
 *
 * unstable_cache serializes the cached value as JSON, which cannot represent
 * bigint. AdminMetricsSummary carries cents as bigint, so the cached layer
 * returns a string-cents DTO and the public function revives the bigints.
 * getRecentPayments is intentionally NOT cached: it is a cheap indexed
 * `ORDER BY created_at LIMIT 20`, and Payment mixes bigint + Date fields that
 * JSON serialization would corrupt (Date -> string).
 */
export const ADMIN_METRICS_TAG = "admin-metrics";
const REVALIDATE_SECONDS = 60;

function repo() {
  return repos.adminMetrics;
}

type SummaryDTO = Omit<
  AdminMetricsSummary,
  "mrrCents" | "revenue30dCents" | "revenueTotalCents"
> & {
  mrrCents: string;
  revenue30dCents: string;
  revenueTotalCents: string;
};

const getAdminSummaryCached = unstable_cache(
  async (): Promise<SummaryDTO> => {
    const s = await repo().getSummary(new Date());
    return {
      ...s,
      mrrCents: s.mrrCents.toString(),
      revenue30dCents: s.revenue30dCents.toString(),
      revenueTotalCents: s.revenueTotalCents.toString(),
    };
  },
  ["admin-summary"],
  { revalidate: REVALIDATE_SECONDS, tags: [ADMIN_METRICS_TAG] },
);

export async function getAdminSummary(): Promise<AdminMetricsSummary> {
  const dto = await getAdminSummaryCached();
  return {
    ...dto,
    mrrCents: BigInt(dto.mrrCents),
    revenue30dCents: BigInt(dto.revenue30dCents),
    revenueTotalCents: BigInt(dto.revenueTotalCents),
  };
}

export const getAdminSeries = unstable_cache(
  async (days = 30): Promise<{ revenue: DailyPoint[]; signups: DailyPoint[] }> => {
    const now = new Date();
    const r = repo();
    const [revenue, signups] = await Promise.all([
      r.getRevenueSeries(now, days),
      r.getSignupSeries(now, days),
    ]);
    return { revenue, signups };
  },
  ["admin-series"],
  { revalidate: REVALIDATE_SECONDS, tags: [ADMIN_METRICS_TAG] },
);

export const getAcquisitionBreakdown = unstable_cache(
  async (): Promise<AcquisitionBreakdown> => repo().getAcquisitionBreakdown(),
  ["admin-acquisition-breakdown"],
  { revalidate: REVALIDATE_SECONDS, tags: [ADMIN_METRICS_TAG] },
);

export async function getRecentPayments(limit = 20): Promise<Payment[]> {
  return repo().listRecentPayments(limit);
}
