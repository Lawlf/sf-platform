import { and, eq, sql } from "drizzle-orm";

import type { McpUsageRepositoryPort } from "@/domain/ports/repositories/mcp-usage.repository";

import { getDb } from "../client";
import { mcpUsageMonthly } from "../schema/mcp-usage-monthly.schema";

export class McpUsageRepository implements McpUsageRepositoryPort {
  async incrementAndGet(userId: string, period: string): Promise<number> {
    const rows = await getDb()
      .insert(mcpUsageMonthly)
      .values({ userId, period, count: 1 })
      .onConflictDoUpdate({
        target: [mcpUsageMonthly.userId, mcpUsageMonthly.period],
        set: { count: sql`${mcpUsageMonthly.count} + 1` },
      })
      .returning();
    return rows[0]?.count ?? 1;
  }

  async getCount(userId: string, period: string): Promise<number> {
    const rows = await getDb()
      .select()
      .from(mcpUsageMonthly)
      .where(and(eq(mcpUsageMonthly.userId, userId), eq(mcpUsageMonthly.period, period)))
      .limit(1);
    return rows[0]?.count ?? 0;
  }
}
