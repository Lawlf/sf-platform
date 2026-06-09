import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../_lib/query-keys";

// Invalida queries client-side que dependem da lista de dívidas. O prefix
// `["timeline"]` cobre o hero (`["timeline","monthDetail",monthIso]`) e a página
// linha-do-tempo (`["timeline", range, show]`); `["planning","projection"]`
// cobre a curva de projeção (home + linha-do-tempo). Dívida altera comprometido,
// saída do mês e projeção, então invalidamos os três. `refetchType: "active"`
// só refaz o que está montado, sem disparar refetches órfãos.
export async function invalidateDebtCaches(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.debts("active") }),
    queryClient.invalidateQueries({ queryKey: queryKeys.debts("all") }),
    queryClient.invalidateQueries({ queryKey: queryKeys.debts("paid_off") }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot }),
    queryClient.invalidateQueries({ queryKey: queryKeys.netWorth }),
    queryClient.invalidateQueries({ queryKey: ["timeline"], refetchType: "active" }),
    queryClient.invalidateQueries({ queryKey: ["planning", "projection"], refetchType: "active" }),
  ]);
}
