import { describe, expect, it, vi } from "vitest";

import { refreshExchangeRates } from "./refresh-exchange-rates.use-case";

const NOW = new Date("2024-01-10T12:00:00Z");
const clock = { now: vi.fn(() => NOW) };

describe("refreshExchangeRates", () => {
  it("writes each fetched rate via upsertDaily", async () => {
    const client = {
      fetchRates: vi.fn().mockResolvedValue([
        { fromCurrency: "USD", toCurrency: "BRL", rateDecimal: "5.01", asOf: NOW },
        { fromCurrency: "EUR", toCurrency: "BRL", rateDecimal: "5.40", asOf: NOW },
      ]),
    };
    const rates = { upsertDaily: vi.fn(), findLatest: vi.fn() };
    const result = await refreshExchangeRates({ client, rates, clock });
    expect(result).toEqual({ ratesWritten: 2, failed: false });
    expect(rates.upsertDaily).toHaveBeenCalledTimes(2);
  });

  it("degrades to failed without throwing when the client errors", async () => {
    const client = { fetchRates: vi.fn().mockRejectedValue(new Error("down")) };
    const rates = { upsertDaily: vi.fn(), findLatest: vi.fn() };
    const result = await refreshExchangeRates({ client, rates, clock });
    expect(result).toEqual({ ratesWritten: 0, failed: true });
    expect(rates.upsertDaily).not.toHaveBeenCalled();
  });
});
