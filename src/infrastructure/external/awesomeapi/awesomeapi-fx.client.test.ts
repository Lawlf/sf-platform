import { describe, expect, it, vi } from "vitest";

import { AwesomeApiFxClient } from "./awesomeapi-fx.client";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("AwesomeApiFxClient", () => {
  it("maps bid + create_date into FxRateQuote per pair", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        USDBRL: { code: "USD", codein: "BRL", bid: "5.01", create_date: "2024-01-02 13:00:00" },
        EURBRL: { code: "EUR", codein: "BRL", bid: "5.40", create_date: "2024-01-02 13:00:00" },
      }),
    );
    const client = new AwesomeApiFxClient({ fetchImpl });
    const quotes = await client.fetchRates([
      { fromCurrency: "USD", toCurrency: "BRL" },
      { fromCurrency: "EUR", toCurrency: "BRL" },
    ]);
    expect(quotes).toHaveLength(2);
    expect(quotes[0]).toMatchObject({ fromCurrency: "USD", toCurrency: "BRL", rateDecimal: "5.01" });
    expect(quotes[0]?.asOf).toBeInstanceOf(Date);
  });

  it("throws when the response is not ok", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("nope", { status: 500 }));
    const client = new AwesomeApiFxClient({ fetchImpl });
    await expect(
      client.fetchRates([{ fromCurrency: "USD", toCurrency: "BRL" }]),
    ).rejects.toThrow();
  });
});
