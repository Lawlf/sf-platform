import { describe, expect, it, vi } from "vitest";

import { CoinGeckoQuoteAdapter } from "./coingecko-quote.adapter";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("CoinGeckoQuoteAdapter", () => {
  it("busca preço em BRL e converte para centavos", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ bitcoin: { brl: 350000.12 }, ethereum: { brl: 18000.5 } }),
    );
    const adapter = new CoinGeckoQuoteAdapter({ fetchImpl });

    const out = await adapter.fetchQuotes(["BTC", "ETH"]);

    expect(out).toEqual([
      { symbol: "BTC", coinId: "bitcoin", priceCents: 35000012n, fetchedAt: expect.any(Date) },
      { symbol: "ETH", coinId: "ethereum", priceCents: 1800050n, fetchedAt: expect.any(Date) },
    ]);
    const calledUrl = (fetchImpl.mock.calls[0] as unknown[])[0] as string;
    expect(calledUrl).toContain("ids=bitcoin,ethereum");
    expect(calledUrl).toContain("vs_currencies=brl");
  });

  it("ignora símbolos desconhecidos", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ bitcoin: { brl: 100 } }));
    const adapter = new CoinGeckoQuoteAdapter({ fetchImpl });

    const out = await adapter.fetchQuotes(["BTC", "NOPE"]);
    expect(out).toHaveLength(1);
    expect(out[0]?.symbol).toBe("BTC");
  });

  it("descarta preço não positivo (resposta inválida/maliciosa)", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ bitcoin: { brl: -100 }, ethereum: { brl: 0 } }));
    const adapter = new CoinGeckoQuoteAdapter({ fetchImpl });
    expect(await adapter.fetchQuotes(["BTC", "ETH"])).toEqual([]);
  });

  it("retorna [] quando a resposta não é ok", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, false, 500));
    const adapter = new CoinGeckoQuoteAdapter({ fetchImpl });
    expect(await adapter.fetchQuotes(["BTC"])).toEqual([]);
  });

  it("retorna [] quando o fetch lança (timeout/rede)", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network");
    });
    const adapter = new CoinGeckoQuoteAdapter({ fetchImpl });
    expect(await adapter.fetchQuotes(["BTC"])).toEqual([]);
  });

  it("retorna [] para lista vazia", async () => {
    const fetchImpl = vi.fn();
    const adapter = new CoinGeckoQuoteAdapter({ fetchImpl });
    expect(await adapter.fetchQuotes([])).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fetchByIds busca por id da moeda (cobre qualquer cripto)", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ worldcoin: { brl: 12.5 } }));
    const adapter = new CoinGeckoQuoteAdapter({ fetchImpl });

    const out = await adapter.fetchByIds(["worldcoin"]);

    expect(out).toEqual([{ coinId: "worldcoin", priceCents: 1250n, fetchedAt: expect.any(Date) }]);
    const calledUrl = (fetchImpl.mock.calls[0] as unknown[])[0] as string;
    expect(calledUrl).toContain("ids=worldcoin");
    expect(calledUrl).toContain("vs_currencies=brl");
  });

  it("fetchByIds retorna [] em falha ou lista vazia", async () => {
    const adapter = new CoinGeckoQuoteAdapter({ fetchImpl: vi.fn(async () => jsonResponse({}, false, 500)) });
    expect(await adapter.fetchByIds(["worldcoin"])).toEqual([]);
    const empty = new CoinGeckoQuoteAdapter({ fetchImpl: vi.fn() });
    expect(await empty.fetchByIds([])).toEqual([]);
  });
});
