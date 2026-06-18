import { describe, expect, it } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import { Money } from "@/domain/value-objects/money.vo";

import { investmentBreakdown } from "./investment-breakdown.service";

const BASE: Omit<AssetEntity, "id" | "label" | "currentValue" | "metadata"> = {
  userId: "u1",
  profileId: "profile-1",
  category: "investment",
  fipeCode: null,
  fipeLastSyncedAt: null,
  acquiredAt: null,
  depreciationKind: "stable",
  depreciationRatePctYear: 0,
  purchaseDate: null,
  purchasePriceCents: null,
  createdAt: new Date("2026-06-10T00:00:00Z"),
  updatedAt: new Date("2026-06-10T00:00:00Z"),
  anchorAt: null,
  deactivatedAt: null,
  deactivationKind: null,
  salePriceCents: null,
  deactivationReason: null,
  deletedAt: null,
  externalAccountKey: null,
};

function inv(id: string, type: string, cents: bigint): AssetEntity {
  return {
    ...BASE,
    id,
    label: id,
    currentValue: Money.fromCents(cents),
    metadata: { kind: "investment", investmentType: type as never },
  };
}

describe("investmentBreakdown", () => {
  it("agrupa ativos de investimento por investmentType somando valor", () => {
    const out = investmentBreakdown([
      inv("a1", "crypto", 70_000_00n),
      inv("a2", "crypto", 30_000_00n),
      inv("a3", "fixed_income", 50_000_00n),
    ]);
    expect(out).toEqual([
      { investmentType: "crypto", totalValueCents: 100_000_00n, count: 2 },
      { investmentType: "fixed_income", totalValueCents: 50_000_00n, count: 1 },
    ]);
  });

  it("ignora ativos que não são investimento e desativados", () => {
    const vehicle = { ...inv("v1", "crypto", 10n), category: "vehicle" as const, metadata: null };
    const inactive = { ...inv("a4", "crypto", 10n), deactivatedAt: new Date() };
    const out = investmentBreakdown([inv("a1", "crypto", 100n), vehicle, inactive]);
    expect(out).toEqual([{ investmentType: "crypto", totalValueCents: 100n, count: 1 }]);
  });

  it("usa 'other' quando o investmentType está ausente", () => {
    const noType = { ...inv("a1", "crypto", 100n), metadata: { kind: "investment" as const } };
    const out = investmentBreakdown([noType as AssetEntity]);
    expect(out).toEqual([{ investmentType: "other", totalValueCents: 100n, count: 1 }]);
  });
});
