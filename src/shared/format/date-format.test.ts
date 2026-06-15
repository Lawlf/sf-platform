import { describe, expect, it } from "vitest";

import { formatDateSafe } from "./date-format";

const FMT = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" });

describe("formatDateSafe", () => {
  it("formata uma data válida", () => {
    expect(formatDateSafe(FMT, new Date("2026-01-01T00:00:00Z"))).toBe("01/01/2026");
  });

  it("retorna null para null/undefined", () => {
    expect(formatDateSafe(FMT, null)).toBeNull();
    expect(formatDateSafe(FMT, undefined)).toBeNull();
  });

  it("retorna null para Invalid Date em vez de lançar RangeError", () => {
    expect(formatDateSafe(FMT, new Date("não é data"))).toBeNull();
    expect(formatDateSafe(FMT, new Date(NaN))).toBeNull();
  });

  it("retorna null para valor que não é Date", () => {
    expect(formatDateSafe(FMT, "2026-01-01" as unknown as Date)).toBeNull();
  });
});
