import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { PersonalLoanDebt } from "@/domain/entities/debt.entity";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import { closeDb, getDb } from "../client";

import { DrizzleAssetDebtAllocationRepository } from "./drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "./drizzle-asset.repository";
import { DrizzleDebtRepository } from "./drizzle-debt.repository";
import { DrizzleUserRepository } from "./drizzle-user.repository";

const TEST_EMAIL = "it-test-asset-user@saborfinanceiro.com.br";
const LABEL_PREFIX = "it-test-asset-";

const users = new DrizzleUserRepository();
const debts = new DrizzleDebtRepository();
const allocations = new DrizzleAssetDebtAllocationRepository();
const repo = new DrizzleAssetRepository();

let userId: string;
let debtId: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const u = await users.create({ email: TEST_EMAIL, emailVerified: true });
  userId = u.id;

  const annual = InterestRate.fromAnnual(0.12);
  if (!isOk(annual)) throw new Error("rate fixture");
  const debt: PersonalLoanDebt = {
    id: randomUUID(),
    userId,
    label: `${LABEL_PREFIX}loan`,
    kind: "personal_loan",
    status: "active",
    originalPrincipal: Money.fromCents(500_000n),
    currentBalance: Money.fromCents(500_000n),
    startDate: new Date("2024-01-01T00:00:00Z"),
    expectedEndDate: null,
    notes: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    annualInterestRate: annual.value,
    termMonths: 24,
    monthlyInstallment: Money.fromCents(25_000n),
    deletedAt: null,
    recurringFrequency: null,
    recurringAmountCents: null,
    expenseCategory: null,
  };
  await debts.create(debt);
  debtId = debt.id;
});

afterEach(async () => {
  await getDb().execute(sql`delete from asset_debt_allocations where debt_id = ${debtId}`);
  await getDb().execute(sql`delete from assets where label like ${LABEL_PREFIX + "%"}`);
});

afterAll(async () => {
  await getDb().execute(sql`delete from debts where label like ${LABEL_PREFIX + "%"}`);
  await getDb().execute(sql`delete from users where email = ${TEST_EMAIL}`);
  await closeDb();
});

function makeVehicle(overrides: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: randomUUID(),
    userId,
    category: "vehicle",
    label: `${LABEL_PREFIX}civic`,
    currentValue: Money.fromCents(8_000_000n),
    metadata: { kind: "vehicle", brand: "Honda", model: "Civic", year: 2022 },
    fipeCode: "0042001",
    fipeLastSyncedAt: new Date("2024-04-01T00:00:00Z"),
    acquiredAt: new Date("2022-06-01T00:00:00Z"),
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    anchorAt: null,
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    externalAccountKey: null,
    ...overrides,
  };
}

function makeRealEstate(overrides: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: randomUUID(),
    userId,
    category: "real_estate",
    label: `${LABEL_PREFIX}apt`,
    currentValue: Money.fromCents(45_000_000n),
    metadata: { kind: "real_estate", addressCity: "Sao Paulo", squareMeters: 75 },
    fipeCode: null,
    fipeLastSyncedAt: null,
    acquiredAt: new Date("2020-03-01T00:00:00Z"),
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
    purchaseDate: null,
    purchasePriceCents: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    anchorAt: null,
    deactivatedAt: null,
    deactivationKind: null,
    salePriceCents: null,
    deactivationReason: null,
    deletedAt: null,
    externalAccountKey: null,
    ...overrides,
  };
}

describe("DrizzleAssetRepository (integration)", () => {
  it("creates and reads an asset by id with metadata round-trip", async () => {
    const entity = makeVehicle();
    await repo.create(entity);

    const found = await repo.findById(entity.id, userId);
    expect(found).not.toBeNull();
    expect(found?.label).toBe(entity.label);
    expect(found?.category).toBe("vehicle");
    expect(found?.currentValue.toCents()).toBe(8_000_000n);
    expect(found?.fipeCode).toBe("0042001");
    expect(found?.metadata).toEqual({
      kind: "vehicle",
      brand: "Honda",
      model: "Civic",
      year: 2022,
    });
  });

  it("findById is scoped by userId (cross-user isolation)", async () => {
    const entity = makeVehicle();
    await repo.create(entity);

    const otherUser = await users.create({
      email: "it-test-asset-other@saborfinanceiro.com.br",
      emailVerified: true,
    });
    try {
      const leaked = await repo.findById(entity.id, otherUser.id);
      expect(leaked).toBeNull();
    } finally {
      await getDb().execute(sql`delete from users where id = ${otherUser.id}`);
    }
  });

  it("findActiveByUser excludes deactivated assets", async () => {
    const active = makeVehicle();
    const inactive = makeRealEstate({
      deactivatedAt: new Date("2024-05-01T00:00:00Z"),
      deactivationReason: "sold",
    });
    await repo.create(active);
    await repo.create(inactive);

    const list = await repo.findActiveByUser(userId);
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(active.id);
  });

  it("findActiveByUserAndCategory filters by both category and active", async () => {
    await repo.create(makeVehicle());
    await repo.create(makeRealEstate());
    await repo.create(
      makeVehicle({
        id: randomUUID(),
        label: `${LABEL_PREFIX}old-car`,
        deactivatedAt: new Date("2024-05-01T00:00:00Z"),
      }),
    );

    const vehicles = await repo.findActiveByUserAndCategory(userId, "vehicle");
    expect(vehicles).toHaveLength(1);
    expect(vehicles[0]?.category).toBe("vehicle");

    const realEstate = await repo.findActiveByUserAndCategory(userId, "real_estate");
    expect(realEstate).toHaveLength(1);
    expect(realEstate[0]?.category).toBe("real_estate");
  });

  it("update mutates label, currentValue, and metadata", async () => {
    const entity = makeVehicle();
    await repo.create(entity);

    const mutated: AssetEntity = {
      ...entity,
      label: `${LABEL_PREFIX}civic-updated`,
      currentValue: Money.fromCents(7_500_000n),
      metadata: { kind: "vehicle", brand: "Honda", model: "Civic", year: 2022, color: "blue" },
      updatedAt: new Date("2024-06-01T00:00:00Z"),
    };
    await repo.update(mutated);

    const reread = await repo.findById(entity.id, userId);
    expect(reread?.label).toBe(`${LABEL_PREFIX}civic-updated`);
    expect(reread?.currentValue.toCents()).toBe(7_500_000n);
    expect(reread?.metadata).toEqual({
      kind: "vehicle",
      brand: "Honda",
      model: "Civic",
      year: 2022,
      color: "blue",
    });
  });

  it("findByIdWithAllocations returns the asset plus its allocations", async () => {
    const asset = makeVehicle();
    await repo.create(asset);

    await allocations.upsert({
      id: randomUUID(),
      assetId: asset.id,
      debtId,
      allocationOriginal: Money.fromCents(300_000n),
      createdAt: new Date("2024-02-01T00:00:00Z"),
      updatedAt: new Date("2024-02-01T00:00:00Z"),
    });

    const result = await repo.findByIdWithAllocations(asset.id, userId);
    expect(result).not.toBeNull();
    expect(result?.asset.id).toBe(asset.id);
    expect(result?.allocations).toHaveLength(1);
    expect(result?.allocations[0]?.allocationOriginal.toCents()).toBe(300_000n);
    expect(result?.allocations[0]?.debtId).toBe(debtId);
  });

  it("findByExternalAccountKey returns the matching asset or null", async () => {
    const entity = makeVehicle({ externalAccountKey: "341:12345-6" });
    await repo.create(entity);

    const found = await repo.findByExternalAccountKey(userId, "341:12345-6");
    expect(found?.id).toBe(entity.id);

    const missing = await repo.findByExternalAccountKey(userId, "000:0");
    expect(missing).toBeNull();
  });

  it("listExternalAccountKeys returns only non-null keys for user", async () => {
    const withKey = makeVehicle({ externalAccountKey: "341:1" });
    const withoutKey = makeRealEstate({ externalAccountKey: null });
    await repo.create(withKey);
    await repo.create(withoutKey);

    const keys = await repo.listExternalAccountKeys(userId);
    expect(keys).toEqual(["341:1"]);
  });

  it("findActiveWithAllocations groups allocations per asset", async () => {
    const car = makeVehicle();
    const apt = makeRealEstate();
    await repo.create(car);
    await repo.create(apt);

    await allocations.upsert({
      id: randomUUID(),
      assetId: car.id,
      debtId,
      allocationOriginal: Money.fromCents(200_000n),
      createdAt: new Date("2024-02-01T00:00:00Z"),
      updatedAt: new Date("2024-02-01T00:00:00Z"),
    });

    const list = await repo.findActiveWithAllocations(userId);
    expect(list).toHaveLength(2);
    const byAsset = new Map(list.map((row) => [row.asset.id, row]));
    expect(byAsset.get(car.id)?.allocations).toHaveLength(1);
    expect(byAsset.get(car.id)?.allocations[0]?.allocationOriginal.toCents()).toBe(200_000n);
    expect(byAsset.get(apt.id)?.allocations).toHaveLength(0);
  });
});
