import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import { Money } from "@/domain/value-objects/money.vo";

import { closeDb, getDb } from "../client";
import { financialPlanningSettings } from "../schema/financial-planning-settings.schema";

import { AssetRepository } from "./asset.repository";
import { FinancialPlanningSettingsRepository } from "./financial-planning-settings.repository";
import { ProfileRepository } from "./profile.repository";
import { UserRepository } from "./user.repository";

const TEST_EMAIL = "it-test-fp-settings-user@saborfinanceiro.com.br";
const ASSET_LABEL_PREFIX = "it-test-fp-settings-asset-";

const users = new UserRepository();
const profiles = new ProfileRepository();
const assets = new AssetRepository();
const repo = new FinancialPlanningSettingsRepository();

let userId: string;
let profileId: string;
let assetId: string;

function makeAsset(overrides: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: randomUUID(),
    userId,
    profileId,
    category: "cash",
    label: `${ASSET_LABEL_PREFIX}conta`,
    currentValue: Money.fromCents(1_000_000n),
    metadata: { kind: "cash" },
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
    ...overrides,
  };
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const u = await users.create({ email: TEST_EMAIL, emailVerified: true });
  userId = u.id;

  const profile = await profiles.ensurePfProfile(userId, new Date());
  profileId = profile.id;

  const asset = makeAsset();
  assetId = asset.id;
  await assets.create(asset);
});

afterEach(async () => {
  await getDb().execute(
    sql`delete from financial_planning_settings where profile_id = ${profileId}`,
  );
});

afterAll(async () => {
  await getDb().execute(sql`delete from assets where label like ${ASSET_LABEL_PREFIX + "%"}`);
  await getDb().execute(sql`delete from users where email = ${TEST_EMAIL}`);
  await closeDb();
});

describe("FinancialPlanningSettingsRepository (integration)", () => {
  it("findByProfile returns null when no settings row exists", async () => {
    const result = await repo.findByProfile(profileId);
    expect(result).toBeNull();
  });

  it("upsertLiquidBucket creates a row; findByProfile returns it", async () => {
    const entity = await repo.upsertLiquidBucket(userId, profileId, assetId);

    expect(entity.userId).toBe(userId);
    expect(entity.profileId).toBe(profileId);
    expect(entity.liquidBucketAssetId).toBe(assetId);
    expect(entity.createdAt).toBeInstanceOf(Date);
    expect(entity.updatedAt).toBeInstanceOf(Date);

    const found = await repo.findByProfile(profileId);
    expect(found).not.toBeNull();
    expect(found?.userId).toBe(userId);
    expect(found?.profileId).toBe(profileId);
    expect(found?.liquidBucketAssetId).toBe(assetId);
  });

  it("upsertLiquidBucket called twice updates the same row and bumps updatedAt", async () => {
    const first = await repo.upsertLiquidBucket(userId, profileId, assetId);

    await new Promise((resolve) => setTimeout(resolve, 5));

    const second = await repo.upsertLiquidBucket(userId, profileId, null);

    expect(second.userId).toBe(userId);
    expect(second.profileId).toBe(profileId);
    expect(second.liquidBucketAssetId).toBeNull();
    expect(second.updatedAt.getTime()).toBeGreaterThanOrEqual(first.updatedAt.getTime());

    const found = await repo.findByProfile(profileId);
    expect(found?.liquidBucketAssetId).toBeNull();

    const allRows = await getDb()
      .select()
      .from(financialPlanningSettings)
      .where(eq(financialPlanningSettings.profileId, profileId));
    expect(allRows).toHaveLength(1);
  });

  it("upsertLiquidBucket with null stores a null bucket", async () => {
    const entity = await repo.upsertLiquidBucket(userId, profileId, null);

    expect(entity.userId).toBe(userId);
    expect(entity.profileId).toBe(profileId);
    expect(entity.liquidBucketAssetId).toBeNull();
    expect(entity.createdAt).toBeInstanceOf(Date);

    const found = await repo.findByProfile(profileId);
    expect(found).not.toBeNull();
    expect(found?.liquidBucketAssetId).toBeNull();
  });

  it("a new liquid-bucket row starts with a zeroed free-balance bucket", async () => {
    await repo.upsertLiquidBucket(userId, profileId, assetId);

    const found = await repo.findByProfile(profileId);
    expect(found?.freeBalanceAccumulatedCents).toBe(0n);
    expect(found?.committedCoveredCents).toBe(0n);
    expect(found?.currentBucketMonth).toBeNull();
  });

  it("upsertFreeBalanceBucket persists the accumulated bucket and month", async () => {
    const entity = await repo.upsertFreeBalanceBucket(userId, profileId, {
      accumulatedCents: 370000n,
      committedCoveredCents: 230000n,
      currentBucketMonth: "2026-06",
    });

    expect(entity.freeBalanceAccumulatedCents).toBe(370000n);
    expect(entity.committedCoveredCents).toBe(230000n);
    expect(entity.currentBucketMonth).toBe("2026-06");

    const found = await repo.findByProfile(profileId);
    expect(found?.freeBalanceAccumulatedCents).toBe(370000n);
    expect(found?.committedCoveredCents).toBe(230000n);
    expect(found?.currentBucketMonth).toBe("2026-06");
  });

  it("upsertFreeBalanceBucket does not clobber the liquid bucket asset", async () => {
    await repo.upsertLiquidBucket(userId, profileId, assetId);
    await repo.upsertFreeBalanceBucket(userId, profileId, {
      accumulatedCents: 500000n,
      committedCoveredCents: 0n,
      currentBucketMonth: "2026-07",
    });

    const found = await repo.findByProfile(profileId);
    expect(found?.liquidBucketAssetId).toBe(assetId);
    expect(found?.freeBalanceAccumulatedCents).toBe(500000n);

    const allRows = await getDb()
      .select()
      .from(financialPlanningSettings)
      .where(eq(financialPlanningSettings.profileId, profileId));
    expect(allRows).toHaveLength(1);
  });
});
