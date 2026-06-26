import { buildGoalMacro } from "@/application/use-cases/goal/build-goal-macro";
import { computeIncomeFreeBalance } from "@/application/use-cases/income/compute-income-free-balance.use-case";
import type { Money } from "@/domain/value-objects/money.vo";
import { clock, repos } from "@/infrastructure/container";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

export interface IncomeFreeBalanceEvent {
  isPro: boolean;
  entrouReais: number;
  /** null pro free (paywall): o número que ele paga pra ver. */
  jaTemDonoReais: number | null;
  livreReais: number | null;
}

export async function computeFreeBalanceEvent(
  userId: string,
  profileId: string,
  amount: Money,
): Promise<IncomeFreeBalanceEvent | null> {
  try {
    const [user, r] = await Promise.all([
      getCurrentUser(),
      computeIncomeFreeBalance(
        {
          debts: repos.debts,
          debtPayments: repos.debtPayments,
          debtAmountAdjustments: repos.debtAmountAdjustments,
          recurringSettlements: repos.recurringSettlements,
          settings: repos.financialPlanningSettings,
          goals: repos.goals,
          goalMacro: (macroInput) =>
            buildGoalMacro(
              {
                assets: repos.assets,
                allocations: repos.assetDebtAllocations,
                debts: repos.debts,
                incomes: repos.incomes,
                clock,
                rates: repos.exchangeRates,
                overrides: repos.userFxOverrides,
              },
              macroInput,
            ),
          now: () => clock.now(),
          rates: repos.exchangeRates,
          overrides: repos.userFxOverrides,
          clock,
        },
        { userId, profileId, eventAmount: amount },
      ),
    ]);
    if (!user || !isOk(r)) return null;
    const isPro = user.isPro;
    return {
      isPro,
      entrouReais: r.value.entrou.toNumber(),
      jaTemDonoReais: isPro ? r.value.jaTemDono.toNumber() : null,
      livreReais: isPro ? r.value.livre.toNumber() : null,
    };
  } catch {
    return null;
  }
}
