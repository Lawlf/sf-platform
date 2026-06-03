import type { NotificationEntity } from "@/domain/entities/notification.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { NotificationRepository } from "@/domain/ports/repositories/notification.repository";
import { ok, type Result } from "@/shared/errors/result";

export interface DetectNegativeBalanceDeps {
  notifications: NotificationRepository;
  clock: Clock;
}

export interface DetectNegativeBalanceInput {
  userId: string;
  monthIso: string;
  freeBalanceCents: bigint;
  triggeredAt?: Date;
}

function brl(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const reais = Number(abs) / 100;
  return `${negative ? "-" : ""}${reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })}`;
}

/**
 * Detecta saldo livre negativo para um (userId, monthIso) e persiste uma
 * notificacao se ainda nao existir. Comportamento:
 *
 * - freeBalance >= 0: no-op (nao mexe em notificacoes antigas; futuro: avaliar
 *   auto-dismiss quando o mes vira positivo).
 * - freeBalance < 0 e ja existe notificacao (mesmo dispensada): no-op
 *   idempotente (nao recria; respeita a decisao do usuario de dispensar).
 * - freeBalance < 0 e nao existe: cria uma nova com payload pronto pra UI.
 */
export async function detectNegativeBalance(
  deps: DetectNegativeBalanceDeps,
  input: DetectNegativeBalanceInput,
): Promise<Result<{ created: boolean; notification: NotificationEntity | null }, never>> {
  if (input.freeBalanceCents >= 0n) {
    return ok({ created: false, notification: null });
  }

  const existing = await deps.notifications.findByUserAndKindAndMonth(
    input.userId,
    "negative_balance_month",
    input.monthIso,
  );
  if (existing) {
    return ok({ created: false, notification: existing });
  }

  const triggeredAt = input.triggeredAt ?? deps.clock.now();
  const entity: NotificationEntity = {
    id: crypto.randomUUID(),
    userId: input.userId,
    kind: "negative_balance_month",
    monthIso: input.monthIso,
    triggeredAt,
    payload: {
      eyebrow: "Atenção",
      line: `Mês fechou com saldo negativo de [[${brl(input.freeBalanceCents)}]].`,
      iconName: "AlertTriangle",
      freeBalanceCents: input.freeBalanceCents.toString(),
    },
    dismissedAt: null,
    readAt: null,
    createdAt: triggeredAt,
  };

  const created = await deps.notifications.create(entity);
  return ok({ created: true, notification: created });
}
