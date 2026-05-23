import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BrapiQuoteAdapter } from "./brapi-quote.adapter";

describe("BrapiQuoteAdapter", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "content-type": "application/json" },
    });
  }

  function makeAdapter(
    overrides: { token?: string; baseUrl?: string; listUrl?: string; timeoutMs?: number } = {},
  ) {
    return new BrapiQuoteAdapter({
      token: overrides.token ?? "test-token",
      baseUrl: overrides.baseUrl ?? "https://brapi.dev/api/quote",
      listUrl: overrides.listUrl ?? "https://brapi.dev/api/quote/list",
      timeoutMs: overrides.timeoutMs ?? 1000,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
  }

  it("returns null when no token is configured", async () => {
    const previous = process.env.BRAPI_TOKEN;
    delete process.env.BRAPI_TOKEN;
    try {
      const adapter = new BrapiQuoteAdapter({
        fetchImpl: fetchMock as unknown as typeof fetch,
      });
      const r = await adapter.fetchQuote("PETR4");
      expect(r).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      if (previous !== undefined) process.env.BRAPI_TOKEN = previous;
    }
  });

  it("returns null when ticker is empty", async () => {
    const adapter = makeAdapter();
    const r = await adapter.fetchQuote("   ");
    expect(r).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a quote when the API responds with a valid result", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        results: [{ symbol: "PETR4", regularMarketPrice: 38.42, currency: "BRL" }],
      }),
    );
    const adapter = makeAdapter();
    const r = await adapter.fetchQuote("petr4");
    expect(r).not.toBeNull();
    expect(r?.symbol).toBe("PETR4");
    expect(r?.priceCents).toBe(3842n);
    expect(r?.currency).toBe("BRL");
    expect(r?.fetchedAt).toBeInstanceOf(Date);
  });

  it("uppercases ticker and encodes it in the URL", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        results: [{ symbol: "VALE3", regularMarketPrice: 60, currency: "BRL" }],
      }),
    );
    const adapter = makeAdapter();
    await adapter.fetchQuote("vale3");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0] ?? "");
    const calledInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(calledUrl).toContain("/VALE3");
    expect(calledUrl).not.toContain("token=");
    expect((calledInit?.headers as Record<string, string>)?.Authorization).toBe(
      "Bearer test-token",
    );
  });

  it("returns null on HTTP error", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 500 }));
    const adapter = makeAdapter();
    const r = await adapter.fetchQuote("PETR4");
    expect(r).toBeNull();
  });

  it("returns null when results array is empty", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));
    const adapter = makeAdapter();
    const r = await adapter.fetchQuote("PETR4");
    expect(r).toBeNull();
  });

  it("returns null when regularMarketPrice is missing", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        results: [{ symbol: "PETR4", currency: "BRL" }],
      }),
    );
    const adapter = makeAdapter();
    const r = await adapter.fetchQuote("PETR4");
    expect(r).toBeNull();
  });

  it("returns null on network error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const adapter = makeAdapter();
    const r = await adapter.fetchQuote("PETR4");
    expect(r).toBeNull();
  });

  it("rounds fractional cents to nearest integer", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        results: [{ symbol: "BBAS3", regularMarketPrice: 28.495, currency: "BRL" }],
      }),
    );
    const adapter = makeAdapter();
    const r = await adapter.fetchQuote("BBAS3");
    // 28.495 * 100 = 2849.5 -> Math.round -> 2850
    expect(r?.priceCents).toBe(2850n);
  });

  describe("fetchQuotes (batch)", () => {
    it("returns [] when called with an empty array", async () => {
      const adapter = makeAdapter();
      const r = await adapter.fetchQuotes([]);
      expect(r).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("throws when more than 10 tickers are requested", async () => {
      const adapter = makeAdapter();
      const eleven = Array.from({ length: 11 }, (_, i) => `T${i}`);
      await expect(adapter.fetchQuotes(eleven)).rejects.toThrow(/máximo de 10 tickers/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns [] when token is missing", async () => {
      const previous = process.env.BRAPI_TOKEN;
      delete process.env.BRAPI_TOKEN;
      try {
        const adapter = new BrapiQuoteAdapter({
          fetchImpl: fetchMock as unknown as typeof fetch,
        });
        const r = await adapter.fetchQuotes(["PETR4", "VALE3"]);
        expect(r).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        if (previous !== undefined) process.env.BRAPI_TOKEN = previous;
      }
    });

    it("joins tickers with commas and uppercases them in the URL", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          results: [
            { symbol: "PETR4", regularMarketPrice: 38.42, currency: "BRL", longName: "Petrobras" },
            { symbol: "VALE3", regularMarketPrice: 60, currency: "BRL", longName: "Vale" },
          ],
        }),
      );
      const adapter = makeAdapter();
      const r = await adapter.fetchQuotes(["petr4", "vale3"]);
      expect(r).toHaveLength(2);
      const calledUrl = String(fetchMock.mock.calls[0]?.[0] ?? "");
      expect(calledUrl).toContain("/PETR4,VALE3");
      expect(calledUrl).not.toContain("token=");
      expect(r[0]?.symbol).toBe("PETR4");
      expect(r[0]?.companyName).toBe("Petrobras");
      expect(r[1]?.symbol).toBe("VALE3");
      expect(r[1]?.companyName).toBe("Vale");
    });

    it("falls back to shortName when longName is missing", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          results: [
            { symbol: "BBAS3", regularMarketPrice: 28.5, currency: "BRL", shortName: "BBAS" },
          ],
        }),
      );
      const adapter = makeAdapter();
      const r = await adapter.fetchQuotes(["BBAS3"]);
      expect(r[0]?.companyName).toBe("BBAS");
    });

    it("omits invalid entries from the response", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          results: [
            { symbol: "PETR4", regularMarketPrice: 38.42, currency: "BRL" },
            { symbol: "BADX", currency: "BRL" }, // sem price
            { symbol: "VALE3", regularMarketPrice: 60, currency: "BRL" },
          ],
        }),
      );
      const adapter = makeAdapter();
      const r = await adapter.fetchQuotes(["PETR4", "BADX", "VALE3"]);
      expect(r).toHaveLength(2);
      expect(r.map((x) => x.symbol)).toEqual(["PETR4", "VALE3"]);
    });

    it("returns [] on HTTP error", async () => {
      fetchMock.mockResolvedValueOnce(new Response("{}", { status: 500 }));
      const adapter = makeAdapter();
      const r = await adapter.fetchQuotes(["PETR4"]);
      expect(r).toEqual([]);
    });

    it("returns [] on network error", async () => {
      fetchMock.mockRejectedValueOnce(new Error("network down"));
      const adapter = makeAdapter();
      const r = await adapter.fetchQuotes(["PETR4"]);
      expect(r).toEqual([]);
    });

    it("filters out empty/blank ticker strings before calling the API", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          results: [{ symbol: "PETR4", regularMarketPrice: 38.42, currency: "BRL" }],
        }),
      );
      const adapter = makeAdapter();
      const r = await adapter.fetchQuotes(["", "  ", "PETR4"]);
      expect(r).toHaveLength(1);
      const calledUrl = String(fetchMock.mock.calls[0]?.[0] ?? "");
      expect(calledUrl).toContain("/PETR4");
      expect(calledUrl).not.toContain("token=");
    });

    it("returns [] when all input tickers are blank (no HTTP call)", async () => {
      const adapter = makeAdapter();
      const r = await adapter.fetchQuotes(["", "  "]);
      expect(r).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("listAvailableStocks", () => {
    it("returns [] when token is missing", async () => {
      const previous = process.env.BRAPI_TOKEN;
      delete process.env.BRAPI_TOKEN;
      try {
        const adapter = new BrapiQuoteAdapter({
          fetchImpl: fetchMock as unknown as typeof fetch,
        });
        const r = await adapter.listAvailableStocks({ limit: 10 });
        expect(r).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        if (previous !== undefined) process.env.BRAPI_TOKEN = previous;
      }
    });

    it("builds query string with token, limit, page, sortBy and sortOrder", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ stocks: [] }));
      const adapter = makeAdapter();
      await adapter.listAvailableStocks({
        limit: 50,
        page: 2,
        sortBy: "volume",
        sortOrder: "desc",
      });
      const calledUrl = String(fetchMock.mock.calls[0]?.[0] ?? "");
      const calledInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
      expect(calledUrl).not.toContain("token=");
      expect(calledUrl).toContain("limit=50");
      expect(calledUrl).toContain("page=2");
      expect(calledUrl).toContain("sortBy=volume");
      expect(calledUrl).toContain("sortOrder=desc");
      expect((calledInit?.headers as Record<string, string>)?.Authorization).toBe(
        "Bearer test-token",
      );
    });

    it("parses stocks and converts close to bigint cents", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          stocks: [
            { stock: "PETR4", name: "Petroleo Brasileiro", close: 38.45 },
            { stock: "vale3", name: "Vale", close: 60 },
          ],
        }),
      );
      const adapter = makeAdapter();
      const r = await adapter.listAvailableStocks({ limit: 10 });
      expect(r).toHaveLength(2);
      expect(r[0]?.ticker).toBe("PETR4");
      expect(r[0]?.name).toBe("Petroleo Brasileiro");
      expect(r[0]?.priceCents).toBe(3845n);
      // ticker normalized to uppercase
      expect(r[1]?.ticker).toBe("VALE3");
      expect(r[1]?.priceCents).toBe(6000n);
    });

    it("sets priceCents to null when close is missing or invalid", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          stocks: [
            { stock: "AAAA3", name: "AAAA" },
            { stock: "BBBB4", name: "BBBB", close: null },
          ],
        }),
      );
      const adapter = makeAdapter();
      const r = await adapter.listAvailableStocks({ limit: 10 });
      expect(r).toHaveLength(2);
      expect(r[0]?.priceCents).toBeNull();
      expect(r[1]?.priceCents).toBeNull();
    });

    it("omits entries without ticker or name", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          stocks: [
            { stock: "PETR4", name: "Petrobras", close: 30 },
            { stock: "", name: "Sem ticker", close: 10 },
            { stock: "VALE3", name: "", close: 60 },
          ],
        }),
      );
      const adapter = makeAdapter();
      const r = await adapter.listAvailableStocks({ limit: 10 });
      expect(r).toHaveLength(1);
      expect(r[0]?.ticker).toBe("PETR4");
    });

    it("returns [] on HTTP error", async () => {
      fetchMock.mockResolvedValueOnce(new Response("{}", { status: 500 }));
      const adapter = makeAdapter();
      const r = await adapter.listAvailableStocks({ limit: 10 });
      expect(r).toEqual([]);
    });

    it("returns [] on network error", async () => {
      fetchMock.mockRejectedValueOnce(new Error("network down"));
      const adapter = makeAdapter();
      const r = await adapter.listAvailableStocks({ limit: 10 });
      expect(r).toEqual([]);
    });
  });
});
