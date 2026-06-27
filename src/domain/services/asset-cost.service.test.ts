import { describe, expect, it } from "vitest";

import { AssetCostService, type AssetCostInput } from "./asset-cost.service";

const REF = new Date("2026-06-15T00:00:00Z");

function tx(over: Partial<AssetCostInput> = {}): AssetCostInput {
  return {
    occurredAt: new Date("2026-06-10T00:00:00Z"),
    direction: "out",
    amountCents: 10000n,
    category: "transporte",
    currency: "BRL",
    excludedFromTotals: false,
    deletedAt: null,
    ...over,
  };
}

describe("AssetCostService", () => {
  it("soma saídas BRL do mês atual como custo do mês", () => {
    const view = AssetCostService.compute(
      [
        tx({ amountCents: 30000n, occurredAt: new Date("2026-06-02T00:00:00Z") }),
        tx({ amountCents: 12000n, occurredAt: new Date("2026-06-14T00:00:00Z") }),
      ],
      { referenceDate: REF, purchaseDate: null },
    );
    expect(view.month.outCents).toBe(42000n);
    expect(view.month.inCents).toBe(0n);
  });

  it("ignora deletada, excluída do mês e moeda diferente de BRL", () => {
    const view = AssetCostService.compute(
      [
        tx({ amountCents: 10000n }),
        tx({ amountCents: 99999n, deletedAt: new Date("2026-06-11T00:00:00Z") }),
        tx({ amountCents: 88888n, excludedFromTotals: true }),
        tx({ amountCents: 77777n, currency: "USD" }),
      ],
      { referenceDate: REF, purchaseDate: null },
    );
    expect(view.month.outCents).toBe(10000n);
  });

  it("last12 cobre 12 meses rolantes e corta o que é mais antigo", () => {
    const view = AssetCostService.compute(
      [
        tx({ amountCents: 10000n, occurredAt: new Date("2025-07-05T00:00:00Z") }),
        tx({ amountCents: 20000n, occurredAt: new Date("2026-06-05T00:00:00Z") }),
        tx({ amountCents: 50000n, occurredAt: new Date("2025-06-30T00:00:00Z") }),
      ],
      { referenceDate: REF, purchaseDate: null },
    );
    expect(view.last12.outCents).toBe(30000n);
  });

  it("byCategory agrupa saídas desc; sem categoria vira 'outros'", () => {
    const view = AssetCostService.compute(
      [
        tx({ amountCents: 10000n, category: "transporte" }),
        tx({ amountCents: 40000n, category: "manutencao" }),
        tx({ amountCents: 5000n, category: null }),
      ],
      { referenceDate: REF, purchaseDate: null },
    );
    expect(view.last12.byCategory).toEqual([
      { category: "manutencao", totalCents: 40000n },
      { category: "transporte", totalCents: 10000n },
      { category: "outros", totalCents: 5000n },
    ]);
  });

  it("entrada atribuída conta como renda e net = renda - custo", () => {
    const view = AssetCostService.compute(
      [
        tx({ direction: "in", amountCents: 200000n }),
        tx({ direction: "out", amountCents: 50000n }),
      ],
      { referenceDate: REF, purchaseDate: null },
    );
    expect(view.month.inCents).toBe(200000n);
    expect(view.month.outCents).toBe(50000n);
    expect(view.month.netCents).toBe(150000n);
  });

  it("projeta anual pelos últimos 12 meses reais quando há histórico cheio", () => {
    const proj = AssetCostService.projectAnnual(
      [
        tx({ amountCents: 10000n, occurredAt: new Date("2025-07-05T00:00:00Z") }),
        tx({ amountCents: 20000n, occurredAt: new Date("2026-06-05T00:00:00Z") }),
      ],
      { referenceDate: REF, monthlyEstimateCents: null },
    );
    expect(proj.basis).toBe("trailing_12m");
    expect(proj.annualCents).toBe(30000n);
  });

  it("extrapola anual quando o histórico é parcial", () => {
    const proj = AssetCostService.projectAnnual(
      [
        tx({ amountCents: 30000n, occurredAt: new Date("2026-05-10T00:00:00Z") }),
        tx({ amountCents: 10000n, occurredAt: new Date("2026-06-10T00:00:00Z") }),
      ],
      { referenceDate: REF, monthlyEstimateCents: null },
    );
    expect(proj.basis).toBe("extrapolated");
    expect(proj.annualCents).toBe(240000n);
  });

  it("usa a estimativa quando não há gasto atrelado suficiente", () => {
    const proj = AssetCostService.projectAnnual([], {
      referenceDate: REF,
      monthlyEstimateCents: 90000n,
    });
    expect(proj.basis).toBe("estimate");
    expect(proj.annualCents).toBe(1080000n);
  });

  it("basis none quando não há nem gasto nem estimativa", () => {
    const proj = AssetCostService.projectAnnual([], {
      referenceDate: REF,
      monthlyEstimateCents: null,
    });
    expect(proj.basis).toBe("none");
    expect(proj.annualCents).toBe(0n);
  });

  it("um único mês de gasto não projeta sozinho (cai pra estimativa ou none)", () => {
    const proj = AssetCostService.projectAnnual(
      [tx({ amountCents: 10000n, occurredAt: new Date("2026-06-10T00:00:00Z") })],
      { referenceDate: REF, monthlyEstimateCents: null },
    );
    expect(proj.basis).toBe("none");
  });

  it("sincePurchase é null sem data de compra e preenchido com ela", () => {
    const txs = [
      tx({ amountCents: 10000n, occurredAt: new Date("2024-01-10T00:00:00Z") }),
      tx({ amountCents: 20000n, occurredAt: new Date("2026-06-05T00:00:00Z") }),
    ];
    const noDate = AssetCostService.compute(txs, { referenceDate: REF, purchaseDate: null });
    expect(noDate.sincePurchase).toBeNull();

    const withDate = AssetCostService.compute(txs, {
      referenceDate: REF,
      purchaseDate: new Date("2024-01-01T00:00:00Z"),
    });
    expect(withDate.sincePurchase?.outCents).toBe(30000n);
  });
});
