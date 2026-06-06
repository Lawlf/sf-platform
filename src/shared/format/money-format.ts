import { Money, type Currency } from "@/domain/value-objects/money.vo";

export function formatCents(
  cents: bigint | number | null | undefined,
  currency: Currency = "BRL",
): string {
  const value = cents === null || cents === undefined ? 0n : BigInt(cents);
  return Money.fromCents(value, currency).format();
}
