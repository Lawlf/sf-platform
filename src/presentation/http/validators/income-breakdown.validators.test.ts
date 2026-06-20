import { describe, expect, it } from "vitest";

import { parseBreakdownJson } from "./income-breakdown.validators";

describe("parseBreakdownJson", () => {
  it("parseia um breakdown diário válido", () => {
    const raw = JSON.stringify({
      basis: "daily",
      lines: [{ count: 8, valuePerShiftCents: 60000 }],
    });
    expect(parseBreakdownJson(raw)).toEqual({
      basis: "daily",
      lines: [{ count: 8, valuePerShiftCents: 60000 }],
    });
  });

  it("parseia um breakdown por hora válido", () => {
    const raw = JSON.stringify({ basis: "hourly", hourlyCents: 5000, hoursPerWeek: 40 });
    expect(parseBreakdownJson(raw)).toEqual({ basis: "hourly", hourlyCents: 5000, hoursPerWeek: 40 });
  });

  it("retorna null para json inválido", () => {
    expect(parseBreakdownJson("{nope")).toBeNull();
  });

  it("retorna null para shape inválido", () => {
    expect(parseBreakdownJson(JSON.stringify({ basis: "weekly" }))).toBeNull();
  });

  it("retorna null para entrada nula", () => {
    expect(parseBreakdownJson(null)).toBeNull();
  });
});
