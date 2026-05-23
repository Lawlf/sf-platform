import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../_lib/query-keys";

// Invalida queries client-side que dependem da lista de dívidas. Server-side
// (revalidatePath) cobre timeline + dashboard SSR; aqui só mexemos no que é
// consumido por useSuspenseQuery/useQuery client-side relacionados a dívidas.
//
// NOTA: NÃO invalidamos prefix `["timeline"]` global. O dashboard hero usa
// `["timeline", "monthDetail", monthIso]` e a página linha-do-tempo usa
// `["timeline", range, show]`. Invalidação por prefix dispara refetches
// concorrentes que confundem o suspense; deixamos para revalidatePath no
// servidor cuidar disso.
export async function invalidateDebtCaches(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.debts("active") }),
    queryClient.invalidateQueries({ queryKey: queryKeys.debts("all") }),
    queryClient.invalidateQueries({ queryKey: queryKeys.debts("paid_off") }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot }),
    queryClient.invalidateQueries({ queryKey: queryKeys.upcomingDues }),
    queryClient.invalidateQueries({ queryKey: queryKeys.netWorth }),
  ]);
}
