import { and, eq, sql } from "drizzle-orm";

import type { UserFxOverrideEntity } from "@/domain/entities/user-fx-override.entity";
import type { UserFxOverrideRepository } from "@/domain/ports/repositories/user-fx-override.repository";
import type { Currency } from "@/domain/value-objects/money.vo";

import { getDb } from "../client";
import {
  userFxOverrides,
  type UserFxOverrideRow,
} from "../schema/user-fx-overrides.schema";

function rowToEntity(row: UserFxOverrideRow): UserFxOverrideEntity {
  return {
    id: row.id,
    userId: row.userId,
    fromCurrency: row.fromCurrency as Currency,
    toCurrency: row.toCurrency as Currency,
    rateDecimal: row.rateDecimal,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleUserFxOverrideRepository implements UserFxOverrideRepository {
  async find(
    userId: string,
    fromCurrency: Currency,
    toCurrency: Currency,
  ): Promise<UserFxOverrideEntity | null> {
    const rows = await getDb()
      .select()
      .from(userFxOverrides)
      .where(
        and(
          eq(userFxOverrides.userId, userId),
          eq(userFxOverrides.fromCurrency, fromCurrency),
          eq(userFxOverrides.toCurrency, toCurrency),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? rowToEntity(row) : null;
  }

  async upsert(
    override: Omit<UserFxOverrideEntity, "id" | "createdAt" | "updatedAt">,
  ): Promise<UserFxOverrideEntity> {
    const rows = await getDb()
      .insert(userFxOverrides)
      .values({
        userId: override.userId,
        fromCurrency: override.fromCurrency,
        toCurrency: override.toCurrency,
        rateDecimal: override.rateDecimal,
      })
      .onConflictDoUpdate({
        target: [
          userFxOverrides.userId,
          userFxOverrides.fromCurrency,
          userFxOverrides.toCurrency,
        ],
        set: { rateDecimal: override.rateDecimal, updatedAt: sql`now()` },
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to upsert user fx override");
    return rowToEntity(row);
  }

  async remove(
    userId: string,
    fromCurrency: Currency,
    toCurrency: Currency,
  ): Promise<void> {
    await getDb()
      .delete(userFxOverrides)
      .where(
        and(
          eq(userFxOverrides.userId, userId),
          eq(userFxOverrides.fromCurrency, fromCurrency),
          eq(userFxOverrides.toCurrency, toCurrency),
        ),
      );
  }

  async listForUser(userId: string): Promise<UserFxOverrideEntity[]> {
    const rows = await getDb()
      .select()
      .from(userFxOverrides)
      .where(eq(userFxOverrides.userId, userId));
    return rows.map(rowToEntity);
  }
}
