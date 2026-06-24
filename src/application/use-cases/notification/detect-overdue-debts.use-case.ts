import type { NotificationEntity } from "@/domain/entities/notification.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { NotificationRepositoryPort } from "@/domain/ports/repositories/notification.repository";
import { isOk, ok, type Result } from "@/shared/errors/result";

import type { OverdueItem } from "@/application/use-cases/debt/get-overdue-debts.use-case";

export interface DetectOverdueDeps {
  getOverdue: (input: {
    userId: string;
    profileId: string;
  }) => Promise<Result<OverdueItem[], never>>;
  notifications: NotificationRepositoryPort;
  clock: Clock;
}

export async function detectOverdueDebts(
  deps: DetectOverdueDeps,
  input: { userId: string; profileId: string },
): Promise<Result<{ created: OverdueItem[] }, never>> {
  const overdueResult = await deps.getOverdue(input);
  const overdue = isOk(overdueResult) ? overdueResult.value : [];
  const created: OverdueItem[] = [];

  for (const item of overdue) {
    const existing = await deps.notifications.findByUserAndKindAndMonth(
      input.userId,
      "payment_overdue",
      item.cycleIso,
    );
    if (existing) continue;

    const triggeredAt = deps.clock.now();
    const entity: NotificationEntity = {
      id: crypto.randomUUID(),
      userId: input.userId,
      kind: "payment_overdue",
      monthIso: item.cycleIso,
      triggeredAt,
      payload: {
        eyebrow: "Venceu",
        line: `Venceu o ${item.label}. Quando resolver, é só dizer aqui.`,
        iconName: "CalendarClock",
        debtId: item.debtId,
        url: `/app/dividas/${item.debtId}`,
        cta: "Ver compromisso",
      },
      dismissedAt: null,
      readAt: null,
      createdAt: triggeredAt,
    };
    await deps.notifications.create(entity);
    created.push(item);
  }

  return ok({ created });
}
