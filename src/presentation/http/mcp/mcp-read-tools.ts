import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getDashboardSnapshot } from "@/application/use-cases/dashboard/get-dashboard-snapshot.use-case";
import { listDebts } from "@/application/use-cases/debt/list-debts.use-case";
import { listGoalsWithProgress } from "@/application/use-cases/goal/list-goals-with-progress.use-case";
import { buildPrescription } from "@/application/use-cases/prescription/build-prescription.use-case";
import { getWalletBalance } from "@/application/use-cases/wallet/get-wallet-balance.use-case";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtPaymentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt-payment.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { DrizzleExchangeRateRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-exchange-rate.repository";
import { DrizzleGoalRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-goal.repository";
import { DrizzleIncomeSettlementRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income-settlement.repository";
import { DrizzleIncomeRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-income.repository";
import { DrizzleRecurringSettlementRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-recurring-settlement.repository";
import { DrizzleTransactionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-transaction.repository";
import { DrizzleUserAchievementRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-achievement.repository";
import { DrizzleUserFxOverrideRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-fx-override.repository";
import { isErr } from "@/shared/errors/result";

import { text } from "./mcp-response";
import { assertScope, enforceUsageOrThrow, requireCtxFromExtra } from "./require-mcp-context";
import { serialize } from "./serialize";

export function registerMcpReadTools(server: McpServer): void {
  server.registerTool(
    "debts_list",
    { description: "Lista suas dívidas ativas." },
    async (extra) => {
      const ctx = requireCtxFromExtra(extra);
      assertScope(ctx, "debts:read");
      await enforceUsageOrThrow(ctx);
      const result = await listDebts(
        { debts: new DrizzleDebtRepository() },
        { userId: ctx.userId },
      );
      if (isErr(result)) throw result.error;
      return text(serialize(result.value));
    },
  );

  server.registerTool(
    "goals_list",
    { description: "Lista suas metas com o progresso de cada uma." },
    async (extra) => {
      const ctx = requireCtxFromExtra(extra);
      assertScope(ctx, "goals:read");
      await enforceUsageOrThrow(ctx);
      const goals = await listGoalsWithProgress(
        {
          goals: new DrizzleGoalRepository(),
          assets: new DrizzleAssetRepository(),
          allocations: new DrizzleAssetDebtAllocationRepository(),
          debts: new DrizzleDebtRepository(),
          incomes: new DrizzleIncomeRepository(),
          clock: new SystemClock(),
          rates: new DrizzleExchangeRateRepository(),
          overrides: new DrizzleUserFxOverrideRepository(),
        },
        { userId: ctx.userId, isPro: ctx.isPro },
      );
      return text(serialize(goals));
    },
  );

  server.registerTool(
    "financial_summary",
    { description: "Mostra seu resumo financeiro do mês: renda, serviço de dívida e saldo livre." },
    async (extra) => {
      const ctx = requireCtxFromExtra(extra);
      assertScope(ctx, "reports:read");
      await enforceUsageOrThrow(ctx);
      const result = await getDashboardSnapshot(
        {
          debts: new DrizzleDebtRepository(),
          incomes: new DrizzleIncomeRepository(),
          clock: new SystemClock(),
          rates: new DrizzleExchangeRateRepository(),
          overrides: new DrizzleUserFxOverrideRepository(),
        },
        { userId: ctx.userId },
      );
      if (isErr(result)) throw result.error;

      const wallet = await getWalletBalance(
        {
          assets: new DrizzleAssetRepository(),
          incomes: new DrizzleIncomeRepository(),
          debts: new DrizzleDebtRepository(),
          settlements: new DrizzleRecurringSettlementRepository(),
          incomeSettlements: new DrizzleIncomeSettlementRepository(),
          debtPayments: new DrizzleDebtPaymentRepository(),
          transactions: new DrizzleTransactionRepository(),
          clock: new SystemClock(),
        },
        { userId: ctx.userId },
      );

      return text(
        serialize({
          ...result.value,
          walletBalance: isErr(wallet) ? null : wallet.value.reactiveBalance,
        }),
      );
    },
  );

  server.registerTool(
    "insights_list",
    { description: "Mostra as recomendações e anomalias detectadas nas suas finanças." },
    async (extra) => {
      const ctx = requireCtxFromExtra(extra);
      assertScope(ctx, "insights:read");
      await enforceUsageOrThrow(ctx);
      const clock = new SystemClock();
      const result = await buildPrescription(
        {
          debts: new DrizzleDebtRepository(),
          incomes: new DrizzleIncomeRepository(),
          assets: new DrizzleAssetRepository(),
          now: () => clock.now(),
          rates: new DrizzleExchangeRateRepository(),
          overrides: new DrizzleUserFxOverrideRepository(),
          clock,
        },
        { userId: ctx.userId },
      );
      if (isErr(result)) throw result.error;
      return text(serialize(result.value));
    },
  );

  server.registerTool(
    "achievements_list",
    { description: "Lista suas conquistas desbloqueadas." },
    async (extra) => {
      const ctx = requireCtxFromExtra(extra);
      assertScope(ctx, "achievements:read");
      await enforceUsageOrThrow(ctx);
      const achievements = await new DrizzleUserAchievementRepository().listForUser(ctx.userId);
      return text(serialize(achievements));
    },
  );
}
