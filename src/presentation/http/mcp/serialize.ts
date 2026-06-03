import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";

export function toPlain(value: unknown): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (value instanceof Money) return { cents: value.toCents().toString(), currency: value.currency };
  if (value instanceof InterestRate) {
    return { annualPct: value.toAnnual().toPercent(), monthlyPct: value.toMonthly().toPercent() };
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = toPlain(v);
    }
    return out;
  }
  return value;
}

export function serialize(entity: unknown): Record<string, unknown> {
  return toPlain(entity) as Record<string, unknown>;
}
