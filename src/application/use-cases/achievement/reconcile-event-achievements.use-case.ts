export interface EventReconcileState {
  hasDebt: boolean;
  hasAsset: boolean;
  hasIncome: boolean;
  hasGoal: boolean;
  hasPaidOffDebt: boolean;
}

/**
 * Backfill das conquistas de evento para usuários que já atingiram o marco
 * antes do lançamento da feature (ex: já tinham a primeira dívida cadastrada).
 * Olha o estado atual e concede o que falta. Idempotente via `award`.
 *
 * `simulou-futuro` não é backfillável (não há registro persistido de execução
 * de simulador), então só é concedida daqui pra frente no próprio action.
 */
export async function reconcileEventAchievements(
  award: (userId: string, slug: string) => Promise<void>,
  state: EventReconcileState,
  userId: string,
): Promise<void> {
  if (state.hasDebt) await award(userId, "primeiro-passo");
  if (state.hasAsset) await award(userId, "mapa-do-tesouro");
  if (state.hasIncome) await award(userId, "renda-a-vista");
  if (state.hasGoal) await award(userId, "norte-definido");
  if (state.hasPaidOffDebt) await award(userId, "quitacao");
}
