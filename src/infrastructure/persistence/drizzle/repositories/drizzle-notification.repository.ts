import { and, desc, eq, isNull, sql } from "drizzle-orm";

import type {
  NotificationEntity,
  NotificationKind,
  NotificationPayload,
} from "@/domain/entities/notification.entity";
import type { NotificationRepository } from "@/domain/ports/repositories/notification.repository";

import { getDb } from "../client";
import {
  notifications,
  type NewNotificationRow,
  type NotificationRow,
} from "../schema/notifications.schema";

const KNOWN_KINDS: ReadonlyArray<NotificationKind> = ["negative_balance_month"];

function parseKind(raw: string): NotificationKind {
  if ((KNOWN_KINDS as ReadonlyArray<string>).includes(raw)) {
    return raw as NotificationKind;
  }
  // Linhas antigas com kinds removidos viram negative_balance_month por seguranca.
  // Em pratica isso nao acontece porque o tipo eh restrito no insert.
  return "negative_balance_month";
}

function parsePayload(raw: unknown): NotificationPayload {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const eyebrow = typeof obj.eyebrow === "string" ? obj.eyebrow : "";
    const line = typeof obj.line === "string" ? obj.line : "";
    const iconName = typeof obj.iconName === "string" ? obj.iconName : "Bell";
    return { ...obj, eyebrow, line, iconName };
  }
  return { eyebrow: "", line: "", iconName: "Bell" };
}

function rowToEntity(row: NotificationRow): NotificationEntity {
  return {
    id: row.id,
    userId: row.userId,
    kind: parseKind(row.kind),
    monthIso: row.monthIso,
    triggeredAt: row.triggeredAt,
    payload: parsePayload(row.payload),
    dismissedAt: row.dismissedAt,
    createdAt: row.createdAt,
  };
}

function entityToRow(entity: NotificationEntity): NewNotificationRow {
  return {
    id: entity.id,
    userId: entity.userId,
    kind: entity.kind,
    monthIso: entity.monthIso,
    triggeredAt: entity.triggeredAt,
    payload: entity.payload,
    dismissedAt: entity.dismissedAt,
    createdAt: entity.createdAt,
  };
}

export class DrizzleNotificationRepository implements NotificationRepository {
  async findById(id: string): Promise<NotificationEntity | null> {
    const rows = await getDb()
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);
    return rows[0] ? rowToEntity(rows[0]) : null;
  }

  async findByUserAndKindAndMonth(
    userId: string,
    kind: NotificationKind,
    monthIso: string | null,
  ): Promise<NotificationEntity | null> {
    const monthCondition =
      monthIso === null ? isNull(notifications.monthIso) : eq(notifications.monthIso, monthIso);
    const rows = await getDb()
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.kind, kind), monthCondition))
      .orderBy(desc(notifications.triggeredAt))
      .limit(1);
    return rows[0] ? rowToEntity(rows[0]) : null;
  }

  async listForUser(
    userId: string,
    opts?: { onlyUndismissed?: boolean },
  ): Promise<NotificationEntity[]> {
    const cond =
      opts?.onlyUndismissed === true
        ? and(eq(notifications.userId, userId), isNull(notifications.dismissedAt))
        : eq(notifications.userId, userId);
    const rows = await getDb()
      .select()
      .from(notifications)
      .where(cond)
      .orderBy(desc(notifications.triggeredAt));
    return rows.map(rowToEntity);
  }

  async countUndismissedForUser(userId: string): Promise<number> {
    const rows = await getDb()
      .select({ count: sql<string>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.dismissedAt)));
    const raw = rows[0]?.count ?? "0";
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  }

  async create(entity: NotificationEntity): Promise<NotificationEntity> {
    const rows = await getDb().insert(notifications).values(entityToRow(entity)).returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to insert notification");
    return rowToEntity(row);
  }

  async markDismissed(id: string, dismissedAt: Date): Promise<void> {
    await getDb().update(notifications).set({ dismissedAt }).where(eq(notifications.id, id));
  }
}
