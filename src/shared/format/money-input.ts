export const MAX_CENTS = 999_999_999_99n;

export type CentsKeyResult =
  | { kind: "ignore" }
  | { kind: "block" }
  | { kind: "commit"; cents: bigint };

const IGNORED_KEYS = new Set([
  "Tab",
  "Enter",
  "Escape",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
]);

export function applyCentsKey(cents: bigint, key: string): CentsKeyResult {
  if (key === "Backspace") return { kind: "commit", cents: cents / 10n };
  if (key === "Delete") return { kind: "commit", cents: 0n };
  if (/^[0-9]$/.test(key)) {
    const next = cents * 10n + BigInt(key);
    return next > MAX_CENTS ? { kind: "block" } : { kind: "commit", cents: next };
  }
  if (IGNORED_KEYS.has(key)) return { kind: "ignore" };
  return { kind: "block" };
}

export function parseCentsFromString(raw: string): bigint | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return 0n;
  const next = BigInt(digits);
  return next > MAX_CENTS ? null : next;
}

export function coerceToCents(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.round(value));
  }
  if (typeof value === "string" && value !== "") {
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  }
  return 0n;
}
