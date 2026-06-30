import { describe, expect, it, vi } from "vitest";

import type { AssetDebtAllocation } from "@/domain/entities/asset-debt-allocation.entity";
import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import type { AssetDebtAllocationRepositoryPort } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { TransactionRepositoryPort } from "@/domain/ports/repositories/transaction.repository";
// AssetRepositoryPort import kept for potential future inline test repos.
import { Money } from "@/domain/value-objects/money.vo";

import {
  executePurchase,
  type ExecutePurchaseDeps,
  type ExecutePurchaseInput,
} from "./create-purchase.action";

function makeAllocationsRepo(): AssetDebtAllocationRepositoryPort {
  return {
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteByDebtId: vi.fn(),
    deleteByAssetId: vi.fn(),
    findByAsset: vi.fn(async () => []),
    findByDebt: vi.fn(async () => []),
    sumAllocationsByDebt: vi.fn(async () => Money.zero()),
  };
}

function makeDebtRepo(): DebtRepositoryPort {
  // Em-memory store: create() persiste; findById() retorna o que foi criado/update'd.
  // Permite que linkAssetToDebt encontre a dívida recém-criada.
  const store = new Map<string, DebtEntity>();
  const repo: DebtRepositoryPort = {
    findById: vi.fn(async (id: string) => store.get(id) ?? null),
    listForProfile: vi.fn(async () => []),
    create: vi.fn(async (e: DebtEntity) => {
      store.set(e.id, e);
      return e;
    }),
    update: vi.fn(async (e: DebtEntity) => {
      store.set(e.id, e);
      return e;
    }),
    setStatus: vi.fn(),
    softDelete: vi.fn(),
    countByExpenseCategory: vi.fn(async () => 0),
    reassignExpenseCategory: vi.fn(),
  };
  return repo;
}

// Helper: cria um asset repo cujo create()/update() popula um store para que
// linkAssetToDebt possa encontrar o asset criado. Aceita um `seed` opcional
// para pré-popular o store com ativos existentes (ex: conta corrente).
function makeAssetRepoWithStore(seed: AssetEntity[] = []): AssetRepositoryPort {
  const store = new Map<string, AssetEntity>();
  for (const a of seed) store.set(a.id, a);
  return {
    create: vi.fn(async (a: AssetEntity) => {
      store.set(a.id, a);
    }),
    update: vi.fn(async (a: AssetEntity) => {
      store.set(a.id, a);
    }),
    findById: vi.fn(async (id: string, profileId: string) => {
      const a = store.get(id);
      if (!a || a.profileId !== profileId) return null;
      return a;
    }),
    findActiveByProfile: vi.fn(async () => []),
    createDefaultWallet: vi.fn(),
    findActiveByProfileAndCategory: vi.fn(async () => []),
    findByIdWithAllocations: vi.fn(async () => null),
    findActiveWithAllocations: vi.fn(async () => []),
    listStockTickersForProfile: vi.fn(async () => []),
    listCryptoTickersForProfile: vi.fn(async () => []),
    softDelete: vi.fn(),
    findByExternalAccountKey: vi.fn(),
    listExternalAccountKeys: vi.fn(async () => []),
  };
}

function makeClock(now = new Date("2026-05-21T10:00:00Z")) {
  return { now: vi.fn(() => now) };
}

function makeTransactionsRepo(): Pick<TransactionRepositoryPort, "create"> {
  return {
    create: vi.fn(async (t: Omit<TransactionEntity, "createdAt">) => ({
      ...t,
      createdAt: new Date("2026-01-01"),
    })),
  };
}

function makeDeps(): ExecutePurchaseDeps {
  return {
    assets: makeAssetRepoWithStore(),
    allocations: makeAllocationsRepo(),
    debts: makeDebtRepo(),
    transactions: makeTransactionsRepo(),
    clock: makeClock(),
  };
}

function makeCashAsset(overrides: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: "cash-1",
    userId: "user-1",
    category: "cash",
    label: "Conta corrente",
    currentValue: Money.fromCents(500_000n), // R$ 5.000
    metadata: { kind: "cash" },
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    monthlyCostEstimateCents: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    anchorAt: null,
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    externalAccountKey: null,
    ...overrides,
    profileId: overrides.profileId ?? "profile-1",
  };
}

const BASE: ExecutePurchaseInput = {
  userId: "user-1",
  profileId: "profile-1",
  name: "iPhone 13",
  valueCents: 500_000n,
  category: "electronics",
  paymentMethod: "cash",
};

describe("executePurchase", () => {
  it("rejects empty name", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, { ...BASE, name: "   " });
    expect(result.ok).toBe(false);
  });

  it("rejects non-positive value", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, { ...BASE, valueCents: 0n });
    expect(result.ok).toBe(false);
  });

  it("cash + asset-generating category (electronics) creates asset only, no debt", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, { ...BASE, category: "electronics" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.assetId).not.toBeNull();
      expect(result.debtId).toBeNull();
    }
    expect(deps.assets.create).toHaveBeenCalledTimes(1);
    expect(deps.debts.create).not.toHaveBeenCalled();
    expect(deps.allocations.upsert).not.toHaveBeenCalled();
  });

  it("cash + travel (no asset) returns assetId=null and debtId=null", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, { ...BASE, category: "travel", name: "Cancun" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.assetId).toBeNull();
      expect(result.debtId).toBeNull();
    }
    expect(deps.assets.create).not.toHaveBeenCalled();
  });

  it("cash + electronics + fromCashAssetId reduces cash asset balance", async () => {
    const cash = makeCashAsset({ currentValue: Money.fromCents(1_000_000n) });
    const deps: ExecutePurchaseDeps = {
      assets: makeAssetRepoWithStore([cash]),
      allocations: makeAllocationsRepo(),
      debts: makeDebtRepo(),
      transactions: makeTransactionsRepo(),
      clock: makeClock(),
    };
    const result = await executePurchase(deps, {
      ...BASE,
      category: "electronics",
      valueCents: 200_000n,
      fromCashAssetId: cash.id,
    });
    expect(result.ok).toBe(true);
    // update called once: para reduzir o saldo da cash asset.
    expect(deps.assets.update).toHaveBeenCalledTimes(1);
    const updatedCall = (deps.assets.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | AssetEntity
      | undefined;
    expect(updatedCall?.currentValue.toCents()).toBe(800_000n);
  });

  it("cash + electronics + fromCashAssetId where purchase > balance clamps at zero", async () => {
    const cash = makeCashAsset({ currentValue: Money.fromCents(100_000n) });
    const deps: ExecutePurchaseDeps = {
      assets: makeAssetRepoWithStore([cash]),
      allocations: makeAllocationsRepo(),
      debts: makeDebtRepo(),
      transactions: makeTransactionsRepo(),
      clock: makeClock(),
    };
    const result = await executePurchase(deps, {
      ...BASE,
      category: "electronics",
      valueCents: 500_000n,
      fromCashAssetId: cash.id,
    });
    expect(result.ok).toBe(true);
    const updatedCall = (deps.assets.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | AssetEntity
      | undefined;
    expect(updatedCall?.currentValue.toCents()).toBe(0n);
  });

  it("cash + electronics without cash asset (no fromCashAssetId) succeeds, no balance update", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      ...BASE,
      category: "electronics",
      valueCents: 200_000n,
    });
    expect(result.ok).toBe(true);
    expect(deps.assets.update).not.toHaveBeenCalled();
  });

  it("credit_card + new card creates card debt + asset + link", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "iPhone 13",
      valueCents: 500_000n,
      category: "electronics",
      paymentMethod: "credit_card",
      installments: 10,
      creditCardDebtId: null,
      newCreditCard: {
        cardLabel: "Nubank",
        creditLimitCents: 1_000_000n,
        closingDay: 5,
        dueDay: 15,
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.assetId).not.toBeNull();
      expect(result.debtId).not.toBeNull();
    }
    expect(deps.debts.create).toHaveBeenCalledTimes(1);
    expect(deps.allocations.upsert).toHaveBeenCalledTimes(1);
  });

  it("credit_card without existing card and without newCreditCard returns error", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "iPhone 13",
      valueCents: 500_000n,
      category: "electronics",
      paymentMethod: "credit_card",
      installments: 10,
      creditCardDebtId: null,
      newCreditCard: null,
    });
    expect(result.ok).toBe(false);
  });

  it("credit_card with existing card updates that card's balance", async () => {
    const existingCard: DebtEntity = {
      id: "card-1",
      userId: "user-1",
      profileId: "profile-1",
      label: "Nubank",
      status: "active",
      originalPrincipal: Money.fromCents(100_000n),
      currentBalance: Money.fromCents(100_000n),
      startDate: new Date("2026-01-01"),
      expectedEndDate: null,
      notes: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      deletedAt: null,
      recurringFrequency: null,
      recurringAmountCents: null,
      expenseCategory: null,
      kind: "credit_card",
      creditLimit: Money.fromCents(1_000_000n),
      statementDay: 5,
      dueDay: 15,
      currentStatement: Money.fromCents(100_000n),
      revolvingBalance: null,
      revolvingMonthlyRate: null,
      installmentPurchases: [],
    };
    // Constrói deps com o cartão existente já no store de débitos.
    const debts = makeDebtRepo();
    // Pré-popula via create direto (o mock interno já guarda no store).
    await debts.create(existingCard);
    // Limpa contador para que o assert "not toHaveBeenCalled" seja preciso.
    (debts.create as ReturnType<typeof vi.fn>).mockClear();
    const deps: ExecutePurchaseDeps = {
      assets: makeAssetRepoWithStore(),
      allocations: makeAllocationsRepo(),
      debts,
      transactions: makeTransactionsRepo(),
      clock: makeClock(),
    };

    const result = await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "iPhone 13",
      valueCents: 500_000n,
      category: "electronics",
      paymentMethod: "credit_card",
      installments: 10,
      creditCardDebtId: "card-1",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.debtId).toBe("card-1");
    }
    expect(deps.debts.update).toHaveBeenCalledTimes(1);
    expect(deps.debts.create).not.toHaveBeenCalled();
    const updatedCard = (deps.debts.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | (DebtEntity & { kind: "credit_card" })
      | undefined;
    expect(updatedCard?.currentStatement.toCents()).toBe(600_000n);
  });

  it("credit_card with existing card belonging to another user returns error", async () => {
    const otherUserCard: DebtEntity = {
      id: "card-1",
      userId: "user-2",
      profileId: "profile-2",
      label: "Outro",
      status: "active",
      originalPrincipal: Money.fromCents(100_000n),
      currentBalance: Money.fromCents(100_000n),
      startDate: new Date("2026-01-01"),
      expectedEndDate: null,
      notes: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      deletedAt: null,
      recurringFrequency: null,
      recurringAmountCents: null,
      expenseCategory: null,
      kind: "credit_card",
      creditLimit: Money.fromCents(1_000_000n),
      statementDay: 5,
      dueDay: 15,
      currentStatement: Money.fromCents(100_000n),
      revolvingBalance: null,
      revolvingMonthlyRate: null,
      installmentPurchases: [],
    };
    const debts = makeDebtRepo();
    await debts.create(otherUserCard);
    const deps: ExecutePurchaseDeps = {
      assets: makeAssetRepoWithStore(),
      allocations: makeAllocationsRepo(),
      debts,
      transactions: makeTransactionsRepo(),
      clock: makeClock(),
    };

    const result = await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "iPhone 13",
      valueCents: 500_000n,
      category: "electronics",
      paymentMethod: "credit_card",
      installments: 10,
      creditCardDebtId: "card-1",
    });
    expect(result.ok).toBe(false);
  });

  it("loan + asset-generating category creates debt + asset + link", async () => {
    const deps = makeDeps();
    // Make allocation succeed: upsert is async no-op; sum returns zero by default.
    const result = await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "Honda Civic 2020",
      valueCents: 8_000_000n,
      category: "vehicle",
      paymentMethod: "loan",
      installments: 48,
      monthlyPaymentCents: 200_000n,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.assetId).not.toBeNull();
      expect(result.debtId).not.toBeNull();
    }
    expect(deps.assets.create).toHaveBeenCalledTimes(1);
    expect(deps.debts.create).toHaveBeenCalledTimes(1);
    // link created
    expect(deps.allocations.upsert).toHaveBeenCalledTimes(1);
  });

  it("loan without monthlyPaymentCents returns error", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "Curso",
      valueCents: 100_000n,
      category: "education",
      paymentMethod: "loan",
      installments: 12,
      monthlyPaymentCents: 0n,
    });
    expect(result.ok).toBe(false);
  });

  it("loan + non-asset category (education) creates debt only, no link", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "Curso de inglês",
      valueCents: 200_000n,
      category: "education",
      paymentMethod: "loan",
      installments: 12,
      monthlyPaymentCents: 20_000n,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.assetId).toBeNull();
      expect(result.debtId).not.toBeNull();
    }
    expect(deps.allocations.upsert).not.toHaveBeenCalled();
  });

  it("link failure becomes warning but result stays ok", async () => {
    const deps = makeDeps();
    // Force sum-by-debt to exceed principal so linkAssetToDebt rejects.
    (deps.allocations.sumAllocationsByDebt as ReturnType<typeof vi.fn>).mockResolvedValue(
      Money.fromCents(10_000_000n),
    );
    const result = await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "Honda Civic 2020",
      valueCents: 8_000_000n,
      category: "vehicle",
      paymentMethod: "loan",
      installments: 48,
      monthlyPaymentCents: 200_000n,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warning).toBeDefined();
    }
  });

  it("does not call allocations.upsert when only asset is created (cash)", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      ...BASE,
      category: "electronics",
    });
    expect(result.ok).toBe(true);
    expect((deps.allocations.upsert as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
  });

  // ---- Plan C: cash asset onboarding inline ----

  it("cashOnboarding=create + electronics creates cash asset + purchase asset + reduces cash", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "iPhone 13",
      valueCents: 200_000n,
      category: "electronics",
      paymentMethod: "cash",
      cashOnboarding: "create",
      cashAssetName: "Nubank",
      currentBalanceCents: 500_000n,
    });
    expect(result.ok).toBe(true);
    // 2 creates: cash asset onboarding + iPhone purchase asset.
    expect(deps.assets.create).toHaveBeenCalledTimes(2);
    // 1 update: redução do saldo do cash asset criado.
    expect(deps.assets.update).toHaveBeenCalledTimes(1);
    const updatedCall = (deps.assets.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | AssetEntity
      | undefined;
    expect(updatedCall?.currentValue.toCents()).toBe(300_000n);
    // O update foi feito no cash asset, não no asset da compra.
    expect(updatedCall?.category).toBe("cash");
    expect(updatedCall?.label).toBe("Nubank");
  });

  it("cashOnboarding=create + travel (no purchase asset) still creates cash asset and reduces it", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "Cancun",
      valueCents: 300_000n,
      category: "travel",
      paymentMethod: "cash",
      cashOnboarding: "create",
      cashAssetName: "Conta corrente",
      currentBalanceCents: 1_000_000n,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.assetId).toBeNull();
    }
    // 1 create: apenas o cash asset (travel não gera asset).
    expect(deps.assets.create).toHaveBeenCalledTimes(1);
    expect(deps.assets.update).toHaveBeenCalledTimes(1);
    const updatedCall = (deps.assets.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | AssetEntity
      | undefined;
    expect(updatedCall?.currentValue.toCents()).toBe(700_000n);
    expect(updatedCall?.category).toBe("cash");
  });

  it("cashOnboarding=skip does not create cash asset and does not reduce any balance", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "iPhone 13",
      valueCents: 200_000n,
      category: "electronics",
      paymentMethod: "cash",
      cashOnboarding: "skip",
    });
    expect(result.ok).toBe(true);
    // 1 create: somente o asset da compra (electronics).
    expect(deps.assets.create).toHaveBeenCalledTimes(1);
    expect(deps.assets.update).not.toHaveBeenCalled();
  });

  it("cashOnboarding=create with missing cashAssetName returns error and skips purchase", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "iPhone 13",
      valueCents: 200_000n,
      category: "electronics",
      paymentMethod: "cash",
      cashOnboarding: "create",
      cashAssetName: "   ",
      currentBalanceCents: 500_000n,
    });
    expect(result.ok).toBe(false);
    expect(deps.assets.create).not.toHaveBeenCalled();
    expect(deps.assets.update).not.toHaveBeenCalled();
  });

  it("cashOnboarding=create with missing currentBalanceCents returns error", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "iPhone 13",
      valueCents: 200_000n,
      category: "electronics",
      paymentMethod: "cash",
      cashOnboarding: "create",
      cashAssetName: "Nubank",
      // currentBalanceCents omitted
    });
    expect(result.ok).toBe(false);
    expect(deps.assets.create).not.toHaveBeenCalled();
  });

  it("cashOnboarding=create when purchase exceeds balance clamps cash asset at zero", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "iPhone 13",
      valueCents: 800_000n,
      category: "electronics",
      paymentMethod: "cash",
      cashOnboarding: "create",
      cashAssetName: "Nubank",
      currentBalanceCents: 500_000n,
    });
    expect(result.ok).toBe(true);
    const updatedCall = (deps.assets.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | AssetEntity
      | undefined;
    expect(updatedCall?.currentValue.toCents()).toBe(0n);
  });

  // ---- Manual value behavior (Step 3) ----

  it("valueBehavior=depreciating with explicit rate creates asset with positive rate", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      ...BASE,
      category: "electronics",
      valueBehavior: "depreciating",
      annualRatePct: 30,
    });
    expect(result.ok).toBe(true);
    const createdAsset = (deps.assets.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | AssetEntity
      | undefined;
    expect(createdAsset?.depreciationKind).toBe("depreciating");
    expect(createdAsset?.depreciationRatePctYear).toBe(30);
  });

  it("valueBehavior=appreciating with explicit rate creates asset with negative rate", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      ...BASE,
      category: "electronics",
      name: "Quadro",
      valueBehavior: "appreciating",
      annualRatePct: 5,
    });
    expect(result.ok).toBe(true);
    const createdAsset = (deps.assets.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | AssetEntity
      | undefined;
    expect(createdAsset?.depreciationKind).toBe("appreciating");
    // Convenção da AssetValuationService: rate negativo aprecia.
    expect(createdAsset?.depreciationRatePctYear).toBe(-5);
  });

  it("valueBehavior=stable creates asset with rate=0", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      ...BASE,
      category: "other",
      name: "Ouro",
      valueBehavior: "stable",
      annualRatePct: 0,
    });
    expect(result.ok).toBe(true);
    const createdAsset = (deps.assets.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | AssetEntity
      | undefined;
    expect(createdAsset?.depreciationKind).toBe("stable");
    expect(createdAsset?.depreciationRatePctYear).toBe(0);
  });

  it("valueBehavior omitted falls back to category default (electronics → depreciating 25%)", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      ...BASE,
      category: "electronics",
    });
    expect(result.ok).toBe(true);
    const createdAsset = (deps.assets.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | AssetEntity
      | undefined;
    expect(createdAsset?.depreciationKind).toBe("depreciating");
    expect(createdAsset?.depreciationRatePctYear).toBe(25);
  });

  it("travel with no valueBehavior still works (no asset created)", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      ...BASE,
      category: "travel",
      name: "Cancun",
      // valueBehavior intentionally omitted (Step 3 pulado para travel)
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.assetId).toBeNull();
    }
    expect(deps.assets.create).not.toHaveBeenCalled();
  });

  it("valueBehavior=appreciating with negative-signed rate is normalized via abs", async () => {
    // Garante que mesmo se o caller passar um número negativo, a regra de
    // sinal é determinada pelo valueBehavior e não pelo sinal do input.
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      ...BASE,
      category: "other",
      name: "Imóvel",
      valueBehavior: "appreciating",
      annualRatePct: -8,
    });
    expect(result.ok).toBe(true);
    const createdAsset = (deps.assets.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | AssetEntity
      | undefined;
    expect(createdAsset?.depreciationKind).toBe("appreciating");
    expect(createdAsset?.depreciationRatePctYear).toBe(-8);
  });

  it("link uses valueCents as allocation, not asset purchase price", async () => {
    const deps = makeDeps();
    // Spy on upsert to check the allocation cents.
    const upserted: AssetDebtAllocation[] = [];
    (deps.allocations.upsert as ReturnType<typeof vi.fn>).mockImplementation(
      async (a: AssetDebtAllocation) => {
        upserted.push(a);
      },
    );
    await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "iPhone",
      valueCents: 750_000n,
      category: "electronics",
      paymentMethod: "credit_card",
      installments: 10,
      newCreditCard: {
        cardLabel: "Nubank",
        creditLimitCents: 2_000_000n,
        closingDay: 5,
        dueDay: 15,
      },
    });
    expect(upserted.length).toBe(1);
    expect(upserted[0]?.allocationOriginal.toCents()).toBe(750_000n);
  });

  it("paymentMethod=financing creates a financing debt with principal = value - downPayment", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "Apartamento",
      valueCents: 500_000_00n,
      category: "other",
      paymentMethod: "financing",
      downPaymentCents: 100_000_00n,
      financingTermMonths: 360,
      financingAnnualRatePct: 9.5,
    });
    expect(result.ok).toBe(true);
    const createdDebt = (deps.debts.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | DebtEntity
      | undefined;
    expect(createdDebt?.kind).toBe("financing");
    expect(createdDebt?.originalPrincipal.toCents()).toBe(400_000_00n);
    if (createdDebt?.kind === "financing") {
      expect(createdDebt.termMonths).toBe(360);
      expect(createdDebt.amortizationMethod).toBe("PRICE");
    }
  });

  it("paymentMethod=financing with downPayment >= value returns error", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "Carro",
      valueCents: 80_000_00n,
      category: "vehicle",
      paymentMethod: "financing",
      downPaymentCents: 80_000_00n,
      financingTermMonths: 60,
      financingAnnualRatePct: 12,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/entrada/i);
    }
  });

  it("paymentMethod=financing with invalid term returns error", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "Casa",
      valueCents: 300_000_00n,
      category: "other",
      paymentMethod: "financing",
      downPaymentCents: 50_000_00n,
      financingTermMonths: 0,
      financingAnnualRatePct: 10,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/parcelas/i);
    }
  });

  // ---- Entrada do financiamento vira saída real (macro-honestidade) ----

  it("financing with downPayment>0 + downPaymentFromAccountId creates an out transaction attributed to the asset and reduces the account", async () => {
    const cash = makeCashAsset({ id: "cash-1", currentValue: Money.fromCents(50_000_00n) });
    const deps: ExecutePurchaseDeps = {
      assets: makeAssetRepoWithStore([cash]),
      allocations: makeAllocationsRepo(),
      debts: makeDebtRepo(),
      transactions: makeTransactionsRepo(),
      clock: makeClock(),
    };
    const result = await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "Carro",
      valueCents: 80_000_00n,
      category: "vehicle",
      paymentMethod: "financing",
      downPaymentCents: 20_000_00n,
      financingTermMonths: 60,
      financingAnnualRatePct: 12,
      downPaymentFromAccountId: "cash-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.assetId).not.toBeNull();

    expect(deps.transactions.create).toHaveBeenCalledTimes(1);
    const created = (deps.transactions.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | Omit<TransactionEntity, "createdAt">
      | undefined;
    expect(created?.direction).toBe("out");
    expect(created?.status).toBe("paid");
    expect(created?.amount.toCents()).toBe(20_000_00n);
    expect(created?.assetId).toBe(result.assetId);

    const updatedCash = (deps.assets.update as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => (call[0] as AssetEntity).id === "cash-1",
    )?.[0] as AssetEntity | undefined;
    expect(updatedCash?.currentValue.toCents()).toBe(30_000_00n);
  });

  it("financing with downPayment>0 and no downPaymentFromAccountId creates no transaction", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "Carro",
      valueCents: 80_000_00n,
      category: "vehicle",
      paymentMethod: "financing",
      downPaymentCents: 20_000_00n,
      financingTermMonths: 60,
      financingAnnualRatePct: 12,
      downPaymentFromAccountId: null,
    });
    expect(result.ok).toBe(true);
    expect(deps.transactions.create).not.toHaveBeenCalled();
  });

  it("financing with downPayment=0 creates no transaction even if downPaymentFromAccountId is set", async () => {
    const deps = makeDeps();
    const result = await executePurchase(deps, {
      userId: "user-1",
      profileId: "profile-1",
      name: "Carro",
      valueCents: 80_000_00n,
      category: "vehicle",
      paymentMethod: "financing",
      downPaymentCents: 0n,
      financingTermMonths: 60,
      financingAnnualRatePct: 12,
      downPaymentFromAccountId: "cash-1",
    });
    expect(result.ok).toBe(true);
    expect(deps.transactions.create).not.toHaveBeenCalled();
  });
});
