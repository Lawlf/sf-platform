import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../_lib/query-keys";

// Invalida queries client-side que dependem de patrimônio. Não tocamos o
// prefix `["timeline"]` (dashboard + linha-do-tempo); essas pages dependem de
// useSuspenseQuery e invalidação por prefix dispara refetches concorrentes
// que zeram o suspense. revalidatePath cobre o lado server-side dessas pages.
export async function invalidateAssetCaches(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.assetsWithAllocations }),
    queryClient.invalidateQueries({ queryKey: queryKeys.netWorth }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot }),
    // Asset edits podem afetar alocações de dívida.
    queryClient.invalidateQueries({ queryKey: queryKeys.debts("active") }),
    queryClient.invalidateQueries({ queryKey: queryKeys.debts("all") }),
    queryClient.invalidateQueries({ queryKey: queryKeys.debts("paid_off") }),
  ]);
}
