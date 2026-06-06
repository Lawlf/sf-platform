import { describe, expect, it, vi } from "vitest";

import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { convertMoney } from "./convert-money.use-case";

const NOW = new Date("2024-01-10T00:00:00Z");
const clock = { now: vi.fn(() => NOW) };

describe("convertMoney", () => {
  it("converts using the resolved auto rate", async () => {
    const rates = {
      upsertDaily: vi.fn(),
      findLatest: vi.fn().mockResolvedValue({ rateDecimal: "5.00", asOf: NOW }),
    };
    const overrides = {
      find: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
      remove: vi.fn(),
      listForUser: vi.fn(),
    };
    const r = await convertMoney(
      { rates, overrides, clock },
      { userId: "u1", amount: Money.fromCents(10000n, "USD"), toCurrency: "BRL" },
    );
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.money.currency).toBe("BRL");
      expect(r.value.money.toCents()).toBe(50000n);
      expect(r.value.source).toBe("auto");
    }
  });
});
