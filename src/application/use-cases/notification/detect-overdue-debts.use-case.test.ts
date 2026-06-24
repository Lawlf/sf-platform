import { describe, expect, it, vi } from "vitest";

import type { NotificationEntity } from "@/domain/entities/notification.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { NotificationRepositoryPort } from "@/domain/ports/repositories/notification.repository";
import { isOk, ok } from "@/shared/errors/result";

import type { OverdueItem } from "@/application/use-cases/debt/get-overdue-debts.use-case";
import type { DetectOverdueDeps } from "./detect-overdue-debts.use-case";
import { detectOverdueDebts } from "./detect-overdue-debts.use-case";

const clock: Clock = { now: () => new Date(2026, 5, 15) };

function makeNotifRepo(
  existing: NotificationEntity | null,
  onCreate?: (e: NotificationEntity) => void,
): NotificationRepositoryPort {
  return {
    findById: vi.fn(async () => null),
    findByUserAndKindAndMonth: vi.fn(async () => existing),
    listForUser: vi.fn(async () => []),
    countUndismissedForUser: vi.fn(async () => 0),
    countUnreadForUser: vi.fn(async () => 0),
    create: vi.fn(async (e: NotificationEntity) => { onCreate?.(e); return e; }),
    markDismissed: vi.fn(),
    markAllReadForUser: vi.fn(),
  };
}

function makeDeps(overdue: OverdueItem[], existingNotif: boolean): { deps: DetectOverdueDeps; created: NotificationEntity[] } {
  const created: NotificationEntity[] = [];
  const existingEntity: NotificationEntity | null = existingNotif
    ? {
        id: "n1",
        userId: "u1",
        kind: "payment_overdue",
        monthIso: "2026-06",
        triggeredAt: new Date(2026, 5, 1),
        payload: { eyebrow: "Venceu", line: "Venceu", iconName: "CalendarClock" },
        dismissedAt: null,
        readAt: null,
        createdAt: new Date(2026, 5, 1),
      }
    : null;

  const deps: DetectOverdueDeps = {
    getOverdue: vi.fn(async () => ok(overdue)),
    notifications: makeNotifRepo(existingEntity, (e) => { created.push(e); }),
    clock,
  };
  return { deps, created };
}

describe("detectOverdueDebts", () => {
  it("cria notif para item vencido sem notif prévia", async () => {
    const { deps, created } = makeDeps(
      [
        {
          debtId: "c1",
          label: "Cartão Nubank",
          dueDate: new Date(2026, 5, 10),
          cycleIso: "2026-06",
          amount: null,
        },
      ],
      false,
    );
    const res = await detectOverdueDebts(deps, { userId: "u1", profileId: "p1" });
    expect(created).toHaveLength(1);
    expect(created[0]!.kind).toBe("payment_overdue");
    expect(created[0]!.monthIso).toBe("2026-06");
    expect(isOk(res) && res.value.created).toHaveLength(1);
  });

  it("é idempotente: não recria se já existe notif do ciclo", async () => {
    const { deps, created } = makeDeps(
      [
        {
          debtId: "c1",
          label: "Cartão",
          dueDate: new Date(2026, 5, 10),
          cycleIso: "2026-06",
          amount: null,
        },
      ],
      true,
    );
    const res = await detectOverdueDebts(deps, { userId: "u1", profileId: "p1" });
    expect(created).toHaveLength(0);
    expect(isOk(res) && res.value.created).toHaveLength(0);
  });
});
