import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";

import type { SendPushToUserDeps } from "./send-push-to-user.use-case";
import { sendPushToUser } from "./send-push-to-user.use-case";

export interface DispatchMonthlySummaryDeps extends SendPushToUserDeps {
  users: UserRepositoryPort;
}

export interface DispatchMonthlySummaryResult {
  pushesSent: number;
}

/**
 * Cron mensal (dia 1, 9h). Dispara resumo macro genérico pra usuários Pro.
 * Iteração futura: payload personalizado (variação patrimônio/dívida do mês).
 */
export async function dispatchMonthlySummaryNotifications(
  deps: DispatchMonthlySummaryDeps,
): Promise<DispatchMonthlySummaryResult> {
  const proUsers = await deps.users.findAllPro();
  let pushesSent = 0;
  const monthLabel = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  for (const user of proUsers) {
    const result = await sendPushToUser(deps, {
      userId: user.id,
      kind: "monthlySummaryEnabled",
      payload: {
        title: "Seu resumo do mês",
        body: `Veja como ${monthLabel} fechou seu patrimônio, dívida e renda.`,
        url: "/app/linha-do-tempo",
        tag: "monthly-summary",
      },
    });
    pushesSent += result.delivered;
  }

  return { pushesSent };
}
