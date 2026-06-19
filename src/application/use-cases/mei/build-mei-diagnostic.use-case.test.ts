import { describe, expect, it } from "vitest";

import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import type { MeiMonthlyEntity } from "@/domain/entities/mei-monthly.entity";
import { WEEKS_PER_MONTH } from "@/domain/services/monthly-frequency";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { buildMeiDiagnostic, type BuildMeiDiagnosticDeps } from "./build-mei-diagnostic.use-case";

function moneyOf(n: number): Money {
  const r = Money.from(n);
  if (!isOk(r)) throw new Error("fixture");
  return r.value;
}

const utc = (y: number, m: number, d: number): Date => new Date(Date.UTC(y, m - 1, d));

function income(over: Partial<IncomeEntity>): IncomeEntity {
  return {
    id: "i1",
    userId: "u1",
    profileId: "pj-1",
    label: "Receita",
    amount: moneyOf(10000),
    frequency: "monthly",
    startDate: utc(2026, 1, 1),
    endDate: null,
    isEstimated: false,
    isActive: true,
    paymentDay: 5,
    createdAt: utc(2026, 1, 1),
    deletedAt: null,
    ...over,
  } as unknown as IncomeEntity;
}

function recurringDebt(over: Partial<DebtEntity>): DebtEntity {
  return {
    id: "d1",
    userId: "u1",
    kind: "recurring",
    label: "Despesa",
    status: "active",
    currentBalance: moneyOf(0),
    recurringFrequency: "monthly",
    recurringAmountCents: 100000n,
    expenseCategory: "outros",
    dueDay: 10,
    startDate: utc(2026, 1, 1),
    expectedEndDate: null,
    createdAt: utc(2026, 1, 1),
    deletedAt: null,
    ...over,
  } as unknown as DebtEntity;
}

function meiEntry(over: Partial<MeiMonthlyEntity>): MeiMonthlyEntity {
  return {
    id: "m1",
    profileId: "pj-1",
    competencia: utc(2026, 6, 1),
    proLaboreCents: 0n,
    gastoPessoalPjCents: 0n,
    createdAt: utc(2026, 6, 1),
    updatedAt: utc(2026, 6, 1),
    ...over,
  };
}

interface FakeOverrides {
  pjIncomes?: IncomeEntity[];
  pjDebts?: DebtEntity[];
  pfDebts?: DebtEntity[];
  mei?: MeiMonthlyEntity | null;
  reactiveBalanceReais?: number | null;
}

function deps(over: FakeOverrides = {}): BuildMeiDiagnosticDeps {
  const balance = over.reactiveBalanceReais;
  return {
    incomes: {
      listForProfile: async (profileId: string) =>
        profileId === "pj-1" ? over.pjIncomes ?? [] : [],
    },
    debts: {
      listForProfile: async (profileId: string) =>
        profileId === "pj-1" ? over.pjDebts ?? [] : over.pfDebts ?? [],
    },
    meiMonthly: {
      findByProfileCompetencia: async () => over.mei ?? null,
    },
    assets: {
      findActiveByProfileAndCategory: async () =>
        balance === null
          ? []
          : [
              {
                id: "wallet-1",
                userId: "u1",
                profileId: "pf-1",
                category: "cash",
                label: "Carteira",
                currentValue: moneyOf(balance ?? 0),
                anchorAt: utc(2026, 6, 1),
                createdAt: utc(2026, 6, 1),
              } as unknown,
            ],
      createDefaultWallet: async () => {},
    },
    settlements: { listForProfileMonth: async () => [] },
    incomeSettlements: { listForProfileMonth: async () => [] },
    debtPayments: { listForProfileInRange: async () => [] },
    transactions: { listForProfileInRange: async () => [] },
    debtAmountAdjustments: { listForProfile: async () => [] },
    clock: { now: () => utc(2026, 6, 4) },
  } as unknown as BuildMeiDiagnosticDeps;
}

const input = {
  pfProfileId: "pf-1",
  pjProfileId: "pj-1",
  userId: "u1",
  competencia: utc(2026, 6, 1),
};

describe("buildMeiDiagnostic", () => {
  it("normaliza despesa recorrente anual como amount/12 (regressão de overcount 12x)", async () => {
    // Faturamento 10.000, despesa anual 12.000 -> mensal 1.000.
    // sobrou = 10.000 - 1.000 - 0 (DAS) - 0 (pró-labore) = 9.000.
    const r = await buildMeiDiagnostic(
      deps({
        pjIncomes: [income({ amount: moneyOf(10000) })],
        pjDebts: [recurringDebt({ recurringFrequency: "annual", recurringAmountCents: 1200000n })],
      }),
      input,
    );
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value.sobrouNaEmpresaCents).toBe(900000n);
  });

  it("separa a DAS das despesas operacionais", async () => {
    // Faturamento 10.000, operacional 1.000, DAS 70 -> sobrou = 8.930.
    const r = await buildMeiDiagnostic(
      deps({
        pjIncomes: [income({ amount: moneyOf(10000) })],
        pjDebts: [
          recurringDebt({ id: "op", recurringAmountCents: 100000n, expenseCategory: "outros" }),
          recurringDebt({ id: "das", recurringAmountCents: 7000n, expenseCategory: "das-mei" }),
        ],
      }),
      input,
    );
    if (!isOk(r)) throw new Error("expected ok");
    expect(r.value.sobrouNaEmpresaCents).toBe(893000n);
  });

  it("soma faturamento de incomes weekly/monthly/one_off do mês", async () => {
    const r = await buildMeiDiagnostic(
      deps({
        pjIncomes: [
          income({ id: "m", frequency: "monthly", amount: moneyOf(1000) }),
          income({ id: "w", frequency: "weekly", amount: moneyOf(100) }),
          income({
            id: "o",
            frequency: "one_off",
            amount: moneyOf(500),
            startDate: utc(2026, 6, 2),
          }),
        ],
      }),
      input,
    );
    if (!isOk(r)) throw new Error("expected ok");
    // monthly 1.000 + weekly (100 * WEEKS_PER_MONTH) + one_off do mês corrente 500.
    const weekly = Math.round(100_00 * WEEKS_PER_MONTH);
    expect(r.value.empresaFaturouCents).toBe(100000n + BigInt(weekly) + 50000n);
  });

  it("usa saldoPf 0 quando não há Carteira (NoWalletError)", async () => {
    // dinheiroReal = saldoPf(0) + max(0, sobrou). Sem faturamento nem despesa, sobrou 0.
    const r = await buildMeiDiagnostic(deps({ reactiveBalanceReais: null }), input);
    if (!isOk(r)) throw new Error("expected ok");
    expect(r.value.dinheiroRealCents).toBe(0n);
  });

  it("não troca PF e PJ: custo de vida vem do PF, faturamento do PJ", async () => {
    // PJ fatura 10.000; PF tem custo de vida 8.000 e pró-labore 2.000 -> pro_labore_curto.
    const r = await buildMeiDiagnostic(
      deps({
        pjIncomes: [income({ amount: moneyOf(10000) })],
        pfDebts: [recurringDebt({ recurringAmountCents: 800000n })],
        mei: meiEntry({ proLaboreCents: 200000n }),
      }),
      input,
    );
    if (!isOk(r)) throw new Error("expected ok");
    expect(r.value.empresaFaturouCents).toBe(1000000n);
    expect(r.value.voceRetirouCents).toBe(200000n);
    const proLaboreCurto = r.value.insights.find((i) => i.kind === "pro_labore_curto");
    expect(proLaboreCurto?.diffCents).toBe(600000n);
    expect(proLaboreCurto?.coberturaPct).toBe(25);
  });

  it("salarioReal = proLabore + gastoPessoalPj", async () => {
    const r = await buildMeiDiagnostic(
      deps({ mei: meiEntry({ proLaboreCents: 300000n, gastoPessoalPjCents: 50000n }) }),
      input,
    );
    if (!isOk(r)) throw new Error("expected ok");
    expect(r.value.salarioRealCents).toBe(350000n);
  });
});
