import "server-only";

import { detectNegativeBalance } from "@/application/use-cases/notification/detect-negative-balance.use-case";
import { TimelineService } from "@/domain/services/timeline.service";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { clock, repos } from "@/infrastructure/container";

/**
 * Helper para disparar deteccao de notificacoes apos uma mutacao critica
 * (registro de pagamento, arquivamento, reativacao de divida). Roda para o mes
 * atual baseado no relogio do sistema. NAO faz revalidatePath; o caller eh
 * responsavel por revalidar /app/notificacoes e /app se necessario.
 *
 * Falhas silenciosas: a deteccao nunca deve quebrar o fluxo principal da
 * mutacao. Erros sao logados via console.error e engolidos.
 */
export async function detectNotificationsForUser(userId: string): Promise<void> {
  try {
    const now = clock.now();
    const currentMonth = MonthYear.fromDate(now);
    const monthIso = currentMonth.toIso();

    const debts = repos.debts;
    const payments = repos.debtPayments;
    const incomes = repos.incomes;
    const assets = repos.assets;
    const adjustmentsRepo = repos.debtAmountAdjustments;

    const [debtsRaw, incomesRaw, paymentsRaw, assetsRaw, adjustmentsRaw] = await Promise.all([
      debts.listForUser(userId, { status: "all" }),
      incomes.listForProfile(userId),
      payments.listForUserInRange(userId, {
        from: currentMonth.firstDay(),
        to: currentMonth.lastDay(),
      }),
      assets.findActiveByUser(userId),
      adjustmentsRepo.listForUser(userId),
    ]);

    const timeline = TimelineService.buildTimeline({
      incomes: incomesRaw,
      debts: debtsRaw,
      payments: paymentsRaw,
      assets: assetsRaw,
      from: currentMonth,
      to: currentMonth,
      adjustments: adjustmentsRaw,
      currentMonth,
    });
    const point = timeline.points[0];
    if (!point) return;
    const freeBalanceCents = point.freeBalance.toCents();

    await detectNegativeBalance(
      { notifications: repos.notifications, clock },
      { userId, monthIso, freeBalanceCents, triggeredAt: now },
    );
  } catch (error) {
    console.error("[notifications.detect] falhou silenciosamente", error);
  }
}
