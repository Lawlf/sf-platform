import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import { Money } from "@/domain/value-objects/money.vo";

import { captureInvestmentSnapshot } from "./capture-investment-snapshot.use-case";

const NOW = new Date("2026-06-15T10:00:00Z");

function inv(id: string, type: string, cents: bigint): AssetEntity {
  return {
    id,
    userId: "u1",
    category: "investment",
    label: id,
    currentValue: Money.fromCents(cents),
    metadata: { kind: "investment", investmentType: type as never },
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    createdAt: NOW,
    updatedAt: NOW,
    anchorAt: null,
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    externalAccountKey: null,
  };
}

describe("captureInvestmentSnapshot", () => {
  it("agrega por tipo e grava o mês-âncora (1º dia)", async () => {
    const replaceMonth = vi.fn(async () => {});
    await captureInvestmentSnapshot(
      { snapshots: { replaceMonth, listForUser: vi.fn() } as never, clock: { now: () => NOW } },
      { userId: "u1", assets: [inv("a", "crypto", 100n), inv("b", "crypto", 50n), inv("c", "fixed_income", 200n)] },
    );
    expect(replaceMonth).toHaveBeenCalledTimes(1);
    const [userId, month, rows] = replaceMonth.mock.calls[0] as unknown[];
    expect(userId).toBe("u1");
    expect((month as Date).toISOString().slice(0, 10)).toBe("2026-06-01");
    expect(rows).toEqual([
      { investmentType: "crypto", totalValueCents: 150n },
      { investmentType: "fixed_income", totalValueCents: 200n },
    ]);
  });

  it("limpa o mês mesmo sem investimento (idempotente)", async () => {
    const replaceMonth = vi.fn(async () => {});
    await captureInvestmentSnapshot(
      { snapshots: { replaceMonth, listForUser: vi.fn() } as never, clock: { now: () => NOW } },
      { userId: "u1", assets: [] },
    );
    expect(replaceMonth).toHaveBeenCalledWith("u1", expect.any(Date), [], NOW);
  });
});
