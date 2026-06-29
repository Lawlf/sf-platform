export type DueBucketKey = "today" | "week" | "month";

export interface DueBucket<T> {
  key: DueBucketKey;
  label: string;
  items: T[];
}

const BUCKET_LABEL: Record<DueBucketKey, string> = {
  today: "Vence hoje",
  week: "Esta semana",
  month: "Esse mês",
};

function bucketFor(daysUntil: number): DueBucketKey {
  if (daysUntil <= 0) return "today";
  if (daysUntil <= 7) return "week";
  return "month";
}

export function groupDuesByProximity<T extends { daysUntil: number }>(dues: T[]): DueBucket<T>[] {
  const ordered = [...dues].sort((a, b) => a.daysUntil - b.daysUntil);
  const order: DueBucketKey[] = ["today", "week", "month"];
  return order
    .map((key) => ({
      key,
      label: BUCKET_LABEL[key],
      items: ordered.filter((d) => bucketFor(d.daysUntil) === key),
    }))
    .filter((bucket) => bucket.items.length > 0);
}
