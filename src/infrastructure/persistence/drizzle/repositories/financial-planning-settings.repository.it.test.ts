import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { AssetEntity } from "@/domain/entities/asset.entity";
import { Money } from "@/domain/value-objects/money.vo";

import { closeDb, getDb } from "../client";
import { financialPlanningSettings } from "../schema/financial-planning-settings.schema";

import { AssetRepository } from "./asset.repository";
import { FinancialPlanningSettingsRepository } from "./financial-planning-settings.repository";
import { UserRepository } from "./user.repository";

const TEST_EMAIL = "it-test-fp-settings-user@saborfinanceiro.com.br";
const ASSET_LABEL_PREFIX = "it-test-fp-settings-asset-";

const users = new UserRepository();
const assets = new AssetRepository();
const repo = new FinancialPlanningSettingsRepository();

let userId: string;
let assetId: string;

function makeAsset(overrides: Partial<AssetEntity> = {}): AssetEntity {
  return {
    id: randomUUID(),
    userId,
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

  const asset = makeAsset();
  assetId = asset.id;
  await assets.create(asset);
});

afterEach(async () => {
  await getDb().execute(
    sql`delete from financial_planning_settings where user_id = ${userId}`,
  );
});

afterAll(async () => {
  await getDb().execute(
    sql`delete from assets where label like ${ASSET_LABEL_PREFIX + "%"}`,
  );
  await getDb().execute(sql`delete from users where email = ${TEST_EMAIL}`);
  await closeDb();
});

describe("FinancialPlanningSettingsRepository (integration)", () => {
  it("findByUser returns null when no settings row exists", async () => {
    const result = await repo.findByUser(userId);
    expect(result).toBeNull();
  });

  it("upsertLiquidBucket creates a row; findByUser returns it", async () => {
    const entity = await repo.upsertLiquidBucket(userId, assetId);

    expect(entity.userId).toBe(userId);
    expect(entity.liquidBucketAssetId).toBe(assetId);
    expect(entity.createdAt).toBeInstanceOf(Date);
    expect(entity.updatedAt).toBeInstanceOf(Date);

    const found = await repo.findByUser(userId);
    expect(found).not.toBeNull();
    expect(found?.userId).toBe(userId);
    expect(found?.liquidBucketAssetId).toBe(assetId);
  });

  it("upsertLiquidBucket called twice updates the same row and bumps updatedAt", async () => {
    const first = await repo.upsertLiquidBucket(userId, assetId);

    await new Promise((resolve) => setTimeout(resolve, 5));

    const second = await repo.upsertLiquidBucket(userId, null);

    expect(second.userId).toBe(userId);
    expect(second.liquidBucketAssetId).toBeNull();
    expect(second.updatedAt.getTime()).toBeGreaterThanOrEqual(first.updatedAt.getTime());

    const found = await repo.findByUser(userId);
    expect(found?.liquidBucketAssetId).toBeNull();

    const allRows = await getDb()
      .select()
      .from(financialPlanningSettings)
      .where(eq(financialPlanningSettings.userId, userId));
    expect(allRows).toHaveLength(1);
  });

  it("upsertLiquidBucket with null stores a null bucket", async () => {
    const entity = await repo.upsertLiquidBucket(userId, null);

    expect(entity.userId).toBe(userId);
    expect(entity.liquidBucketAssetId).toBeNull();
    expect(entity.createdAt).toBeInstanceOf(Date);

    const found = await repo.findByUser(userId);
    expect(found).not.toBeNull();
    expect(found?.liquidBucketAssetId).toBeNull();
  });
});
