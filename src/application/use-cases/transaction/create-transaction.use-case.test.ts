import { describe, expect, it, vi } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { TransactionEntity } from "@/domain/entities/transaction.entity";
import { Money } from "@/domain/value-objects/money.vo";

import { createTransaction, type CreateTransactionDeps } from "./create-transaction.use-case";

function cashAsset(over: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: "acc1",
    userId: "u1",
    category: "cash",
    label: "Carteira",
    currentValue: Money.fromCents(100000n),
    metadata: { kind: "cash", yieldType: "none" },
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    anchorAt: null,
    createdAt: new Date("2026-06-01T00:00:00Z"),
    updatedAt: new Date("2026-06-01T00:00:00Z"),
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    ...over,
  } as AssetEntity;
}

function makeDeps(over: Partial<CreateTransactionDeps> = {}): CreateTransactionDeps {
  return {
    transactions: {
      create: vi.fn(async (t: Omit<TransactionEntity, "createdAt">) => ({
        ...t,
        createdAt: new Date("2026-06-05T00:00:00Z"),
      })),
    },
    assets: {
      findById: vi.fn(async () => cashAsset()),
      findActiveByUserAndCategory: vi.fn(async () => [cashAsset()]),
      createDefaultWallet: vi.fn(async () => undefined),
      update: vi.fn(async () => undefined),
    },
    clock: { now: () => new Date("2026-06-05T00:00:00Z") },
    ...over,
  } as unknown as CreateTransactionDeps;
}

describe("createTransaction", () => {
  it("usa a conta informada e decrementa saldo numa saída paga", async () => {
    const deps = makeDeps();
    const r = await createTransaction(deps, {
      userId: "u1",
      direction: "out",
      amount: Money.fromCents(30000n),
      description: "Mercado",
      category: "Alimentação",
      accountId: "acc1",
      occurredAt: null,
      status: "paid",
    });
    expect(r._tag).toBe("ok");
    const upd = (deps.assets.update as ReturnType<typeof vi.fn>).mock.calls[0]![0] as AssetEntity;
    expect(upd.currentValue.toCents()).toBe(70000n);
  });

  it("entrada paga incrementa saldo", async () => {
    const deps = makeDeps();
    await createTransaction(deps, {
      userId: "u1",
      direction: "in",
      amount: Money.fromCents(50000n),
      description: "Pix",
      category: "transfer",
      accountId: "acc1",
      occurredAt: null,
      status: "paid",
    });
    const upd = (deps.assets.update as ReturnType<typeof vi.fn>).mock.calls[0]![0] as AssetEntity;
    expect(upd.currentValue.toCents()).toBe(150000n);
  });

  it("scheduled não move saldo", async () => {
    const deps = makeDeps();
    await createTransaction(deps, {
      userId: "u1",
      direction: "out",
      amount: Money.fromCents(30000n),
      description: "Conta futura",
      category: "Outros",
      accountId: "acc1",
      occurredAt: null,
      status: "scheduled",
    });
    expect(deps.assets.update).not.toHaveBeenCalled();
  });

  it("sem conta e sem ativo cash, cria Carteira default", async () => {
    const created: AssetEntity[] = [];
    const deps = makeDeps({
      assets: {
        findById: vi.fn(async () => null),
        findActiveByUserAndCategory: vi.fn(async () => []),
        createDefaultWallet: vi.fn(async (a: AssetEntity) => {
          created.push(a);
        }),
        update: vi.fn(async () => undefined),
      } as unknown as CreateTransactionDeps["assets"],
    });
    const r = await createTransaction(deps, {
      userId: "u1",
      direction: "out",
      amount: Money.fromCents(1000n),
      description: "x",
      category: null,
      accountId: null,
      occurredAt: null,
      status: "paid",
    });
    expect(r._tag).toBe("ok");
    expect(created).toHaveLength(1);
    expect(created[0]?.label).toBe("Carteira");
  });

  it("sem conta mas com ativo cash existente, usa o primeiro", async () => {
    const deps = makeDeps();
    const r = await createTransaction(deps, {
      userId: "u1",
      direction: "out",
      amount: Money.fromCents(1000n),
      description: "x",
      category: null,
      accountId: null,
      occurredAt: null,
      status: "paid",
    });
    expect(r._tag).toBe("ok");
    expect(deps.assets.createDefaultWallet).not.toHaveBeenCalled();
    if (r._tag === "ok") expect(r.value.accountId).toBe("acc1");
  });
});
