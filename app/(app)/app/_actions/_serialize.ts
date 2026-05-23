import type { Money } from "@/domain/value-objects/money.vo";

export interface SerializedMoney {
  cents: string;
  formatted: string;
}

export function serializeMoney(m: Money): SerializedMoney {
  return { cents: m.toCents().toString(), formatted: m.format() };
}
