import { describe, expect, it, vi } from "vitest";

import { isErr, isOk } from "@/shared/errors/result";

import { resolveFxRate } from "./resolve-fx-rate.use-case";

function makeRates(latest: unknown) {
  return { upsertDaily: vi.fn(), findLatest: vi.fn().mockResolvedValue(latest) };
}
function makeOverrides(found: unknown) {
  return {
    find: vi.fn().mockResolvedValue(found),
    upsert: vi.fn(),
    remove: vi.fn(),
    listForUser: vi.fn(),
  };
}
const NOW = new Date("2024-01-10T00:00:00Z");
const clock = { now: vi.fn(() => NOW) };

describe("resolveFxRate", () => {
  it("returns identity for same currency without lookups", async () => {
    const rates = makeRates(null);
    const overrides = makeOverrides(null);
    const r = await resolveFxRate(
      { rates, overrides, clock },
      { userId: "u1", fromCurrency: "BRL", toCurrency: "BRL" },
    );
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.rate).toBe(1);
      expect(r.value.source).toBe("identity");
    }
    expect(overrides.find).not.toHaveBeenCalled();
  });

  it("prefers a user override over auto rates", async () => {
    const rates = makeRates({ rateDecimal: "5.00", asOf: NOW });
    const overrides = makeOverrides({ rateDecimal: "5.50", updatedAt: NOW });
    const r = await resolveFxRate(
      { rates, overrides, clock },
      { userId: "u1", fromCurrency: "USD", toCurrency: "BRL" },
    );
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.rate).toBe(5.5);
      expect(r.value.source).toBe("override");
    }
  });

  it("falls back to the latest auto rate and flags staleness", async () => {
    const old = new Date("2023-12-01T00:00:00Z");
    const rates = makeRates({ rateDecimal: "5.00", asOf: old });
    const overrides = makeOverrides(null);
    const r = await resolveFxRate(
      { rates, overrides, clock },
      { userId: "u1", fromCurrency: "USD", toCurrency: "BRL" },
    );
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.rate).toBe(5);
      expect(r.value.source).toBe("auto");
      expect(r.value.stale).toBe(true);
    }
  });

  it("errors when no override and no auto rate exist", async () => {
    const rates = makeRates(null);
    const overrides = makeOverrides(null);
    const r = await resolveFxRate(
      { rates, overrides, clock },
      { userId: "u1", fromCurrency: "USD", toCurrency: "BRL" },
    );
    expect(isErr(r)).toBe(true);
  });
});
