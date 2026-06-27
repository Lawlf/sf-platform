import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { PersonalLoanDebt } from "@/domain/entities/debt.entity";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { closeDb, getDb } from "../client";

import { AssetDebtAllocationRepository } from "./asset-debt-allocation.repository";
import { AssetRepository } from "./asset.repository";
import { DebtRepository } from "./debt.repository";
import { ProfileRepository } from "./profile.repository";
import { UserRepository } from "./user.repository";

const TEST_EMAIL = "it-test-alloc-user@saborfinanceiro.com.br";
const LABEL_PREFIX = "it-test-alloc-";

const users = new UserRepository();
const profiles = new ProfileRepository();
const debtsRepo = new DebtRepository();
const assetsRepo = new AssetRepository();
const repo = new AssetDebtAllocationRepository();

let userId: string;
let profileId: string;
let debtIdA: string;
let debtIdB: string;
let assetIdA: string;
let assetIdB: string;

function makeDebt(label: string): PersonalLoanDebt {
  const annual = InterestRate.fromAnnual(0.12);
  if (!isOk(annual)) throw new Error("rate fixture");
  return {
    id: randomUUID(),
    userId,
    profileId,
    label: `${LABEL_PREFIX}${label}`,
    kind: "personal_loan",
    dueDay: null,
    status: "active",
    originalPrincipal: Money.fromCents(1_000_000n),
    currentBalance: Money.fromCents(1_000_000n),
    startDate: new Date("2024-01-01T00:00:00Z"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    annualInterestRate: annual.value,
    termMonths: 24,
    monthlyInstallment: Money.fromCents(50_000n),
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
}

function makeAsset(label: string): AssetEntity {
  return {
    id: randomUUID(),
    userId,
    profileId,
    category: "vehicle",
    label: `${LABEL_PREFIX}${label}`,
    currentValue: Money.fromCents(5_000_000n),
    metadata: { kind: "vehicle", brand: "Honda", model: "Civic", year: 2022 },
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: null,
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    monthlyCostEstimateCents: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    anchorAt: null,
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    externalAccountKey: null,
  };
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const u = await users.create({ email: TEST_EMAIL, emailVerified: true });
  userId = u.id;
  const profile = await profiles.ensurePfProfile(userId, new Date());
  profileId = profile.id;

  const dA = makeDebt("debt-a");
  const dB = makeDebt("debt-b");
  await debtsRepo.create(dA);
  await debtsRepo.create(dB);
  debtIdA = dA.id;
  debtIdB = dB.id;

  const aA = makeAsset("car-a");
  const aB = makeAsset("car-b");
  await assetsRepo.create(aA);
  await assetsRepo.create(aB);
  assetIdA = aA.id;
  assetIdB = aB.id;
});

afterEach(async () => {
  await getDb().execute(
    sql`delete from asset_debt_allocations where debt_id in (${debtIdA}, ${debtIdB})`,
  );
});

afterAll(async () => {
  await getDb().execute(sql`delete from assets where label like ${LABEL_PREFIX + "%"}`);
  await getDb().execute(sql`delete from debts where label like ${LABEL_PREFIX + "%"}`);
  await getDb().execute(sql`delete from users where email = ${TEST_EMAIL}`);
  await closeDb();
});

describe("AssetDebtAllocationRepository (integration)", () => {
  it("upsert inserts a new (asset, debt) pair", async () => {
    await repo.upsert({
      id: randomUUID(),
      assetId: assetIdA,
      debtId: debtIdA,
      allocationOriginal: Money.fromCents(400_000n),
      createdAt: new Date("2024-02-01T00:00:00Z"),
      updatedAt: new Date("2024-02-01T00:00:00Z"),
    });

    const list = await repo.findByAsset(assetIdA);
    expect(list).toHaveLength(1);
    expect(list[0]?.allocationOriginal.toCents()).toBe(400_000n);
    expect(list[0]?.debtId).toBe(debtIdA);
  });

  it("upsert updates the existing pair (conflict on assetId+debtId)", async () => {
    const id1 = randomUUID();
    await repo.upsert({
      id: id1,
      assetId: assetIdA,
      debtId: debtIdA,
      allocationOriginal: Money.fromCents(400_000n),
      createdAt: new Date("2024-02-01T00:00:00Z"),
      updatedAt: new Date("2024-02-01T00:00:00Z"),
    });

    await repo.upsert({
      id: randomUUID(),
      assetId: assetIdA,
      debtId: debtIdA,
      allocationOriginal: Money.fromCents(700_000n),
      createdAt: new Date("2024-02-01T00:00:00Z"),
      updatedAt: new Date("2024-03-01T00:00:00Z"),
    });

    const list = await repo.findByAsset(assetIdA);
    expect(list).toHaveLength(1);
    expect(list[0]?.allocationOriginal.toCents()).toBe(700_000n);
    expect(list[0]?.id).toBe(id1);
  });

  it("delete removes a specific (asset, debt) pair", async () => {
    await repo.upsert({
      id: randomUUID(),
      assetId: assetIdA,
      debtId: debtIdA,
      allocationOriginal: Money.fromCents(100_000n),
      createdAt: new Date("2024-02-01T00:00:00Z"),
      updatedAt: new Date("2024-02-01T00:00:00Z"),
    });
    await repo.upsert({
      id: randomUUID(),
      assetId: assetIdA,
      debtId: debtIdB,
      allocationOriginal: Money.fromCents(200_000n),
      createdAt: new Date("2024-02-01T00:00:00Z"),
      updatedAt: new Date("2024-02-01T00:00:00Z"),
    });

    await repo.delete(assetIdA, debtIdA);

    const remaining = await repo.findByAsset(assetIdA);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.debtId).toBe(debtIdB);
  });

  it("findByDebt returns all allocations targeting a debt", async () => {
    await repo.upsert({
      id: randomUUID(),
      assetId: assetIdA,
      debtId: debtIdA,
      allocationOriginal: Money.fromCents(300_000n),
      createdAt: new Date("2024-02-01T00:00:00Z"),
      updatedAt: new Date("2024-02-01T00:00:00Z"),
    });
    await repo.upsert({
      id: randomUUID(),
      assetId: assetIdB,
      debtId: debtIdA,
      allocationOriginal: Money.fromCents(150_000n),
      createdAt: new Date("2024-02-01T00:00:00Z"),
      updatedAt: new Date("2024-02-01T00:00:00Z"),
    });

    const list = await repo.findByDebt(debtIdA);
    expect(list).toHaveLength(2);
    const sumCents = list.reduce((acc, a) => acc + a.allocationOriginal.toCents(), 0n);
    expect(sumCents).toBe(450_000n);
  });

  it("sumAllocationsByDebt totals all allocations for the debt", async () => {
    await repo.upsert({
      id: randomUUID(),
      assetId: assetIdA,
      debtId: debtIdA,
      allocationOriginal: Money.fromCents(300_000n),
      createdAt: new Date("2024-02-01T00:00:00Z"),
      updatedAt: new Date("2024-02-01T00:00:00Z"),
    });
    await repo.upsert({
      id: randomUUID(),
      assetId: assetIdB,
      debtId: debtIdA,
      allocationOriginal: Money.fromCents(150_000n),
      createdAt: new Date("2024-02-01T00:00:00Z"),
      updatedAt: new Date("2024-02-01T00:00:00Z"),
    });

    const total = await repo.sumAllocationsByDebt(debtIdA);
    expect(total.toCents()).toBe(450_000n);
  });

  it("sumAllocationsByDebt returns 0 when no allocations exist for the debt", async () => {
    const total = await repo.sumAllocationsByDebt(debtIdB);
    expect(total.toCents()).toBe(0n);
  });

  it("sumAllocationsByDebt excludes the provided assetId when supplied", async () => {
    await repo.upsert({
      id: randomUUID(),
      assetId: assetIdA,
      debtId: debtIdA,
      allocationOriginal: Money.fromCents(300_000n),
      createdAt: new Date("2024-02-01T00:00:00Z"),
      updatedAt: new Date("2024-02-01T00:00:00Z"),
    });
    await repo.upsert({
      id: randomUUID(),
      assetId: assetIdB,
      debtId: debtIdA,
      allocationOriginal: Money.fromCents(150_000n),
      createdAt: new Date("2024-02-01T00:00:00Z"),
      updatedAt: new Date("2024-02-01T00:00:00Z"),
    });

    const totalExcludingA = await repo.sumAllocationsByDebt(debtIdA, assetIdA);
    expect(totalExcludingA.toCents()).toBe(150_000n);
  });
});
