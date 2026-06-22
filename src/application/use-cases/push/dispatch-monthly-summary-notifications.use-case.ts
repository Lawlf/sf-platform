import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";

import type { SendPushToUserDeps } from "./send-push-to-user.use-case";
import { sendPushToUser } from "./send-push-to-user.use-case";

export interface MonthlyFreeCashFlow {
  cents: bigint;
  formatted: string;
}

export interface DispatchMonthlySummaryDeps extends SendPushToUserDeps {
  users: UserRepositoryPort;
  // Sobra/falta projetada do mês por usuário (renda - saída). null = sem dado.
  getMonthlyFreeCashFlow: (userId: string) => Promise<MonthlyFreeCashFlow | null>;
}

export interface DispatchMonthlySummaryResult {
  pushesSent: number;
}

function summaryPayload(monthLabel: string, flow: MonthlyFreeCashFlow | null) {
  // Sem dado: empurrão calmo pra abrir e atualizar, sem prometer número.
  if (!flow) {
    return {
      title: `Começou ${monthLabel}`,
      body: "Bora ver se o mês fecha? Atualize o que mudou e veja sua sobra.",
      url: "/app",
      tag: "monthly-summary",
    };
  }
  const positive = flow.cents >= 0n;
  const abs = flow.formatted.replace("-", "").trim();
  return {
    title: positive ? "Seu mês começou no azul" : "Seu mês começou apertado",
    body: positive
      ? `No ritmo de hoje, sobra ${abs} no fim do mês. Toque pra garantir.`
      : `No ritmo de hoje, falta ${abs} pra fechar o mês. Toque pra ver o que ajustar.`,
    url: "/app",
    tag: "monthly-summary",
  };
}

/**
 * Cron mensal (dia 1). Empurra cada Pro com a sobra/falta real do mês e um
 * proximo passo, em vez de "olhe um painel". O numero vem de getMonthlyFreeCashFlow.
 */
export async function dispatchMonthlySummaryNotifications(
  deps: DispatchMonthlySummaryDeps,
): Promise<DispatchMonthlySummaryResult> {
  const proUsers = await deps.users.findAllPro();
  let pushesSent = 0;
  const monthLabel = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  for (const user of proUsers) {
    const flow = await deps.getMonthlyFreeCashFlow(user.id);
    const result = await sendPushToUser(deps, {
      userId: user.id,
      kind: "monthlySummaryEnabled",
      payload: summaryPayload(monthLabel, flow),
    });
    pushesSent += result.delivered;
  }

  return { pushesSent };
}
