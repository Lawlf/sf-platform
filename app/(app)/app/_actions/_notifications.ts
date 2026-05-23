import "server-only";

import { detectNegativeBalance } from "@/application/use-cases/notification/detect-negative-balance.use-case";
import { TimelineService } from "@/domain/services/timeline.service";
import { MonthYear } from "@/domain/value-objects/month-year.vo";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtAmountAdjustmentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt-amount-adjustment.repository";
import { DrizzleDebtPaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt-payment.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { DrizzleNotificationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-notification.repository";

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
    const clock = new SystemClock();
    const now = clock.now();
    const currentMonth = MonthYear.fromDate(now);
    const monthIso = currentMonth.toIso();

    const debts = new DrizzleDebtRepository();
    const payments = new DrizzleDebtPaymentRepository();
    const incomes = new DrizzleIncomeRepository();
    const assets = new DrizzleAssetRepository();
    const adjustmentsRepo = new DrizzleDebtAmountAdjustmentRepository();

    const [debtsRaw, incomesRaw, paymentsRaw, assetsRaw, adjustmentsRaw] = await Promise.all([
      debts.listForUser(userId, { status: "all" }),
      incomes.listForUser(userId),
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
    });
    const point = timeline.points[0];
    if (!point) return;
    const freeBalanceCents = point.freeBalance.toCents();

    await detectNegativeBalance(
      { notifications: new DrizzleNotificationRepository(), clock },
      { userId, monthIso, freeBalanceCents, triggeredAt: now },
    );
  } catch (error) {
    console.error("[notifications.detect] falhou silenciosamente", error);
  }
}
