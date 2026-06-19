import { getUpcomingDueDates } from "@/application/use-cases/dashboard/get-upcoming-due-dates.use-case";
import { DEBT_DUE_DAYS_BEFORE_DEFAULT } from "@/domain/entities/notification-preferences.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import { Money } from "@/domain/value-objects/money.vo";
import { isOk } from "@/shared/errors/result";

import type { SendPushToUserDeps } from "./send-push-to-user.use-case";
import { sendPushToUser } from "./send-push-to-user.use-case";

export interface DispatchDebtDueDeps extends SendPushToUserDeps {
  users: UserRepositoryPort;
  debts: DebtRepositoryPort;
  clock: Clock;
  resolveProfileId: (userId: string) => Promise<string>;
}

export interface DispatchDebtDueResult {
  usersTargeted: number;
  pushesSent: number;
}

/**
 * Cron diário (manhã). Pra cada usuário Pro com `debtDueEnabled`, computa a
 * próxima parcela de cada dívida ativa e dispara um aviso quando faltam
 * exatamente `debtDueDaysBefore` dias pro vencimento. Várias parcelas na mesma
 * janela viram um único push (batch). Respeita o master `pushEnabled`.
 *
 * Dedup natural: como só um dia do calendário casa com a antecedência e o cron
 * roda 1x/dia, cada parcela é avisada uma única vez. Não precisa de marca
 * persistida.
 */
export async function dispatchDebtDueNotifications(
  deps: DispatchDebtDueDeps,
): Promise<DispatchDebtDueResult> {
  const proUsers = await deps.users.findAllPro();
  let pushesSent = 0;
  let usersTargeted = 0;

  // Comparações de vencimento são por dia de calendário: normalizamos "agora"
  // pro início do dia local, pra que uma parcela que vence hoje conte como 0
  // dias (e não role pro mês seguinte na lógica de próximo vencimento).
  const today = startOfLocalDay(deps.clock.now());
  const dayClock: Clock = { now: () => today };

  for (const user of proUsers) {
    const prefs = await deps.preferences.findForUser(user.id);
    // Otimização: pula cedo quem desligou o master ou o tipo. O sendPushToUser
    // também checa, mas evitamos computar vencimentos à toa.
    if (prefs && (!prefs.pushEnabled || !prefs.debtDueEnabled)) continue;
    const daysBefore = prefs?.debtDueDaysBefore ?? DEBT_DUE_DAYS_BEFORE_DEFAULT;

    const profileId = await deps.resolveProfileId(user.id);
    const duesResult = await getUpcomingDueDates(
      { debts: deps.debts, clock: dayClock },
      { userId: user.id, profileId, horizonDays: daysBefore + 1 },
    );
    const dues = isOk(duesResult) ? duesResult.value : [];
    const matching = dues.filter(
      (d) => calendarDaysBetween(today, startOfLocalDay(d.dueDate)) === daysBefore,
    );
    if (matching.length === 0) continue;

    const result = await sendPushToUser(deps, {
      userId: user.id,
      kind: "debtDueEnabled",
      payload: {
        title: "Vencimento de dívida",
        body: buildBody(matching, daysBefore),
        url: "/app/dividas",
        tag: "debt-due-reminder",
      },
    });
    if (!result.skipped) {
      usersTargeted++;
      pushesSent += result.delivered;
    }
  }

  return { usersTargeted, pushesSent };
}

interface DueLike {
  label: string;
  amount: Money | null;
}

function buildBody(matching: ReadonlyArray<DueLike>, daysBefore: number): string {
  const when = whenLabel(daysBefore);
  if (matching.length === 1) {
    const due = matching[0]!;
    const amount = due.amount ? ` (${due.amount.format()})` : "";
    return `${due.label} vence ${when}${amount}.`;
  }

  const allKnown = matching.every((m) => m.amount !== null);
  let suffix = "";
  if (allKnown) {
    const totalCents = matching.reduce(
      (sum, m) => sum + (m.amount?.toCents() ?? BigInt(0)),
      BigInt(0),
    );
    suffix = `, somando ${Money.fromCents(totalCents).format()}`;
  }
  return `${matching.length} parcelas vencem ${when}${suffix}.`;
}

function whenLabel(daysBefore: number): string {
  if (daysBefore <= 0) return "hoje";
  if (daysBefore === 1) return "amanhã";
  return `em ${daysBefore} dias`;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function calendarDaysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86400000);
}
