import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ParallelumFipeClient } from "./parallelum-fipe.client";

describe("ParallelumFipeClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeClient(overrides: { cacheTtlMs?: number; timeoutMs?: number } = {}) {
    return new ParallelumFipeClient({
      fetchImpl: fetchMock as unknown as typeof fetch,
      timeoutMs: overrides.timeoutMs ?? 1000,
      cacheTtlMs: overrides.cacheTtlMs ?? 60_000,
    });
  }

  function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "content-type": "application/json" },
    });
  }

  it("listBrands maps codigo/nome to code/name", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        { codigo: "1", nome: "Acura" },
        { codigo: "2", nome: "Audi" },
      ]),
    );
    const client = makeClient();
    const brands = await client.listBrands();
    expect(brands).toEqual([
      { code: "1", name: "Acura" },
      { code: "2", name: "Audi" },
    ]);
  });

  it("listModels unwraps modelos array", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        modelos: [{ codigo: "10", nome: "Civic" }],
        anos: [],
      }),
    );
    const client = makeClient();
    const models = await client.listModels("2");
    expect(models).toEqual([{ code: "10", name: "Civic" }]);
  });

  it("listYears maps codigo/nome to code/name", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        { codigo: "2020-1", nome: "2020 Gasolina" },
        { codigo: "2021-1", nome: "2021 Gasolina" },
      ]),
    );
    const client = makeClient();
    const years = await client.listYears("21", "4828");
    expect(years).toEqual([
      { code: "2020-1", name: "2020 Gasolina" },
      { code: "2021-1", name: "2021 Gasolina" },
    ]);
  });

  it("getVehicleValue parses BRL value to cents", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        Valor: "R$ 89.500,00",
        Marca: "Honda",
        Modelo: "Civic LX 1.7 16V 130cv Mec.",
        AnoModelo: 2003,
        MesReferencia: "Maio de 2026",
      }),
    );
    const client = makeClient();
    const data = await client.getVehicleValue("21/4828/2003-1");
    expect(data.value.toCents()).toBe(8_950_000n);
    expect(data.brand).toBe("Honda");
    expect(data.model).toBe("Civic LX 1.7 16V 130cv Mec.");
    expect(data.year).toBe(2003);
    expect(data.referenceMonth).toBe("Maio de 2026");
    expect(data.fipeCode).toBe("21/4828/2003-1");
  });

  it("getVehicleValue parses BRL with cents and thousand separators", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        Valor: "R$ 1.691,78",
        Marca: "X",
        Modelo: "Y",
        AnoModelo: "2020",
        MesReferencia: "Maio de 2026",
      }),
    );
    const client = makeClient();
    const data = await client.getVehicleValue("1/2/3");
    expect(data.value.toCents()).toBe(169_178n);
    expect(data.year).toBe(2020);
  });

  it("caches responses within TTL", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ codigo: "1", nome: "Acura" }]));
    const client = makeClient();
    await client.listBrands();
    await client.listBrands();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("re-fetches after TTL expires", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([{ codigo: "1", nome: "Acura" }]))
      .mockResolvedValueOnce(jsonResponse([{ codigo: "1", nome: "Acura" }]));
    const client = makeClient({ cacheTtlMs: 0 });
    await client.listBrands();
    await client.listBrands();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once on HTTP 500", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "down" }, 500))
      .mockResolvedValueOnce(jsonResponse([{ codigo: "1", nome: "Acura" }]));
    const client = makeClient();
    const brands = await client.listBrands();
    expect(brands).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once on network error", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(jsonResponse([{ codigo: "1", nome: "Acura" }]));
    const client = makeClient();
    const brands = await client.listBrands();
    expect(brands).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws when both attempts fail with HTTP 4xx", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "bad" }, 404));
    const client = makeClient();
    await expect(client.listBrands()).rejects.toThrow(/FIPE HTTP 404/);
  });

  it("throws on invalid fipeCode shape", async () => {
    const client = makeClient();
    await expect(client.getVehicleValue("not-a-valid-code")).rejects.toThrow(
      /Invalid fipeCode format/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws when BRL value cannot be parsed", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        Valor: "indisponivel",
        Marca: "X",
        Modelo: "Y",
        AnoModelo: 2020,
        MesReferencia: "Maio de 2026",
      }),
    );
    const client = makeClient();
    await expect(client.getVehicleValue("1/2/3")).rejects.toThrow(/Cannot parse FIPE value/);
  });
});
