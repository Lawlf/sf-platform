import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { UserRepository } from "@/domain/ports/repositories/user.repository";

import type { SendPushToUserDeps } from "./send-push-to-user.use-case";
import { sendPushToUser } from "./send-push-to-user.use-case";

export interface DispatchDebtDueDeps extends SendPushToUserDeps {
  users: UserRepository;
  debts: DebtRepository;
}

export interface DispatchDebtDueResult {
  usersTargeted: number;
  pushesSent: number;
}

/**
 * Cron diário (manhã). Pra cada usuário Pro com dívidas ativas, dispara
 * um digest "Você tem N dívidas em aberto somando R$ X". Respeita prefs:
 * pushEnabled (master) + debtDueEnabled (tipo).
 *
 * MVP simplificado: notifica por presença de dívidas, não por proximidade
 * de vencimento de parcela específica. Iteração futura: cron checa
 * próxima parcela de cada debt e notifica X dias antes.
 */
export async function dispatchDebtDueNotifications(
  deps: DispatchDebtDueDeps,
): Promise<DispatchDebtDueResult> {
  const proUsers = await deps.users.findAllPro();
  let pushesSent = 0;
  let usersTargeted = 0;

  for (const user of proUsers) {
    const debts = await deps.debts.listForUser(user.id);
    const active = debts.filter((d) => d.status === "active" && d.deletedAt === null);
    if (active.length === 0) continue;

    const totalCents = active.reduce(
      (sum, d) => sum + d.currentBalance.toCents(),
      BigInt(0),
    );
    const totalFormatted = formatBrl(totalCents);
    const body =
      active.length === 1
        ? `Você tem 1 dívida em aberto: ${totalFormatted}.`
        : `Você tem ${active.length} dívidas em aberto somando ${totalFormatted}.`;

    const result = await sendPushToUser(deps, {
      userId: user.id,
      kind: "debtDueEnabled",
      payload: {
        title: "Resumo das suas dívidas",
        body,
        url: "/app/dividas",
        tag: "debt-due-digest",
      },
    });
    if (!result.skipped) {
      usersTargeted++;
      pushesSent += result.delivered;
    }
  }

  return { usersTargeted, pushesSent };
}

function formatBrl(cents: bigint): string {
  const value = Number(cents) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
