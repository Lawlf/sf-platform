import { and, eq } from "drizzle-orm";

import type { ModuleProgressEntity } from "@/domain/entities/module-progress.entity";
import type {
  MarkModuleCompletedInput,
  ModuleProgressRepositoryPort,
} from "@/domain/ports/repositories/module-progress.repository";

import { getDb } from "../client";
import { moduleProgress, type ModuleProgressRow } from "../schema/module-progress.schema";

function toEntity(row: ModuleProgressRow): ModuleProgressEntity {
  return {
    id: row.id,
    userId: row.userId,
    trilhaSlug: row.trilhaSlug,
    moduleNum: row.moduleNum,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
  };
}

export class ModuleProgressRepository implements ModuleProgressRepositoryPort {
  async markCompleted(input: MarkModuleCompletedInput): Promise<ModuleProgressEntity> {
    const inserted = await getDb()
      .insert(moduleProgress)
      .values({
        userId: input.userId,
        trilhaSlug: input.trilhaSlug,
        moduleNum: input.moduleNum,
        completedAt: input.completedAt,
      })
      .onConflictDoNothing({
        target: [moduleProgress.userId, moduleProgress.trilhaSlug, moduleProgress.moduleNum],
      })
      .returning();

    if (inserted[0]) return toEntity(inserted[0]);

    const existing = await getDb()
      .select()
      .from(moduleProgress)
      .where(
        and(
          eq(moduleProgress.userId, input.userId),
          eq(moduleProgress.trilhaSlug, input.trilhaSlug),
          eq(moduleProgress.moduleNum, input.moduleNum),
        ),
      )
      .limit(1);

    const row = existing[0];
    if (!row) throw new Error("Failed to read module_progress after conflict");
    return toEntity(row);
  }

  async findCompletedNums(userId: string, trilhaSlug: string): Promise<number[]> {
    const rows = await getDb()
      .select({ moduleNum: moduleProgress.moduleNum })
      .from(moduleProgress)
      .where(and(eq(moduleProgress.userId, userId), eq(moduleProgress.trilhaSlug, trilhaSlug)));
    return rows.map((r) => r.moduleNum);
  }
}
