import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";


import { getDashboardSnapshot } from "@/application/use-cases/dashboard/get-dashboard-snapshot.use-case";
import { listDebts } from "@/application/use-cases/debt/list-debts.use-case";
import { listGoalsWithProgress } from "@/application/use-cases/goal/list-goals-with-progress.use-case";
import { buildPrescription } from "@/application/use-cases/prescription/build-prescription.use-case";
import { getWalletBalance } from "@/application/use-cases/wallet/get-wallet-balance.use-case";
import { clock, repos } from "@/infrastructure/container";
import { resolvePfProfileId } from "@/presentation/http/middleware/active-profile";
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
        { debts: repos.debts },
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
      const goalProfileId = await resolvePfProfileId(ctx.userId);
      const goals = await listGoalsWithProgress(
        {
          goals: repos.goals,
          assets: repos.assets,
          allocations: repos.assetDebtAllocations,
          debts: repos.debts,
          incomes: repos.incomes,
          clock,
          rates: repos.exchangeRates,
          overrides: repos.userFxOverrides,
        },
        { userId: ctx.userId, profileId: goalProfileId, isPro: ctx.isPro },
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
      const profileId = await resolvePfProfileId(ctx.userId);
      const result = await getDashboardSnapshot(
        {
          debts: repos.debts,
          incomes: repos.incomes,
          clock,
          rates: repos.exchangeRates,
          overrides: repos.userFxOverrides,
        },
        { userId: ctx.userId, profileId },
      );
      if (isErr(result)) throw result.error;

      const wallet = await getWalletBalance(
        {
          assets: repos.assets,
          incomes: repos.incomes,
          debts: repos.debts,
          settlements: repos.recurringSettlements,
          incomeSettlements: repos.incomeSettlements,
          debtPayments: repos.debtPayments,
          transactions: repos.transactions,
          debtAmountAdjustments: repos.debtAmountAdjustments,
          clock,
        },
        { userId: ctx.userId, profileId },
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
      const profileId = await resolvePfProfileId(ctx.userId);
      const result = await buildPrescription(
        {
          debts: repos.debts,
          incomes: repos.incomes,
          assets: repos.assets,
          now: () => clock.now(),
          rates: repos.exchangeRates,
          overrides: repos.userFxOverrides,
          clock,
        },
        { userId: ctx.userId, profileId },
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
      const achievements = await repos.userAchievements.listForUser(ctx.userId);
      return text(serialize(achievements));
    },
  );
}
