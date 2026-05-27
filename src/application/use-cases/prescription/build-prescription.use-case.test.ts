import { describe, expect, it } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { buildPrescription } from "./build-prescription.use-case";

const NOW = new Date("2026-05-25T00:00:00Z");
const m = (r: number) => {
  const x = Money.from(r);
  if (!isOk(x)) throw new Error("m");
  return x.value;
};
const rate = (d: number) => {
  const x = InterestRate.fromMonthly(d);
  if (!isOk(x)) throw new Error("r");
  return x.value;
};

const income: IncomeEntity = {
  id: "i1",
  userId: "u1",
  label: "Salário",
  amount: m(5000),
  frequency: "monthly",
  startDate: NOW,
  endDate: null,
  isActive: true,
  createdAt: NOW,
  deletedAt: null,
};

const dearCard = {
  id: "nubank",
  userId: "u1",
  label: "Nubank",
  kind: "credit_card",
  status: "active",
  currentBalance: m(3000),
  originalPrincipal: m(3000),
  creditLimit: m(6000),
  statementDay: 1,
  dueDay: 10,
  currentStatement: m(1000),
  revolvingBalance: m(3000),
  revolvingMonthlyRate: rate(0.129),
  installmentPurchases: [],
  createdAt: NOW,
  deletedAt: null,
} as unknown as DebtEntity;

const cashAsset = {
  id: "a1",
  userId: "u1",
  category: "cash",
  label: "Reserva",
  currentValue: m(5000),
  metadata: null,
  createdAt: NOW,
  deletedAt: null,
} as unknown as AssetEntity;

const deps = {
  debts: { listForUser: async () => [dearCard] },
  incomes: { listForUser: async () => [income] },
  assets: { findActiveByUser: async () => [cashAsset] },
  now: () => NOW,
};

describe("buildPrescription", () => {
  it("assembles a bleeding prescription for an expensive card with cushion present", async () => {
    const r = await buildPrescription(deps as never, { userId: "u1" });
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.state).toBe("bleeding");
    expect(r.value.dominant?.targetDebtId).toBe("nubank");
  });
});
