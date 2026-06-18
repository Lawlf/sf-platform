import { and, asc, eq } from "drizzle-orm";

import type { InvestmentSnapshotEntity } from "@/domain/entities/investment-snapshot.entity";
import type {
  InvestmentSnapshotRepositoryPort,
  InvestmentSnapshotRow as PortRow,
} from "@/domain/ports/repositories/investment-snapshot.repository";

import { getDb } from "../client";
import {
  investmentSnapshots,
  type InvestmentSnapshotRow,
} from "../schema/investment-snapshots.schema";

function rowToEntity(row: InvestmentSnapshotRow): InvestmentSnapshotEntity {
  return {
    userId: row.userId,
    profileId: row.profileId,
    month: row.month,
    investmentType: row.investmentType,
    totalValueCents: row.totalValueCents,
    capturedAt: row.capturedAt,
  };
}

export class InvestmentSnapshotRepository
  implements InvestmentSnapshotRepositoryPort
{
  async replaceMonth(
    userId: string,
    profileId: string,
    month: Date,
    rows: PortRow[],
    capturedAt: Date,
  ): Promise<void> {
    await getDb().transaction(async (tx) => {
      await tx
        .delete(investmentSnapshots)
        .where(
          and(
            eq(investmentSnapshots.profileId, profileId),
            eq(investmentSnapshots.month, month),
          ),
        );
      if (rows.length === 0) return;
      await tx.insert(investmentSnapshots).values(
        rows.map((r) => ({
          userId,
          profileId,
          month,
          investmentType: r.investmentType,
          totalValueCents: r.totalValueCents,
          capturedAt,
        })),
      );
    });
  }

  async listForProfile(profileId: string): Promise<InvestmentSnapshotEntity[]> {
    const rows = await getDb()
      .select()
      .from(investmentSnapshots)
      .where(eq(investmentSnapshots.profileId, profileId))
      .orderBy(asc(investmentSnapshots.month));
    return rows.map(rowToEntity);
  }
}
