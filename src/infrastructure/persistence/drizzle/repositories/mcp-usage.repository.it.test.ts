import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "../client";
import { mcpUsageMonthly } from "../schema/mcp-usage-monthly.schema";
import { users } from "../schema/users.schema";

import { McpUsageRepository } from "./mcp-usage.repository";

describe("McpUsageRepository (it)", () => {
  const repo = new McpUsageRepository();
  let userId: string;

  afterAll(async () => {
    if (userId) await getDb().delete(users).where(eq(users.id, userId));
  });

  it("incrementAndGet acumula por período", async () => {
    const inserted = await getDb()
      .insert(users)
      .values({ email: `mcp-usage-${Date.now()}@test.local`, plan: "free", isPro: false })
      .returning();
    userId = inserted[0]!.id;

    expect(await repo.incrementAndGet(userId, "2026-06")).toBe(1);
    expect(await repo.incrementAndGet(userId, "2026-06")).toBe(2);
    expect(await repo.getCount(userId, "2026-06")).toBe(2);
    expect(await repo.getCount(userId, "2026-07")).toBe(0);

    await getDb().delete(mcpUsageMonthly).where(eq(mcpUsageMonthly.userId, userId));
  });
});
