import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../_lib/query-keys";

// Invalida queries client-side que dependem de patrimônio. O prefix `["timeline"]`
// cobre hero + linha-do-tempo e `["planning","projection"]` a curva de projeção;
// patrimônio altera o saldo livre que alimenta as duas. `refetchType: "active"`
// só refaz o que está montado, sem disparar refetches órfãos.
export async function invalidateAssetCaches(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.assetsWithAllocations }),
    queryClient.invalidateQueries({ queryKey: queryKeys.netWorth }),
    queryClient.invalidateQueries({ queryKey: queryKeys.walletBalance }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot }),
    // Asset edits podem afetar alocações de dívida.
    queryClient.invalidateQueries({ queryKey: queryKeys.debts("active") }),
    queryClient.invalidateQueries({ queryKey: queryKeys.debts("all") }),
    queryClient.invalidateQueries({ queryKey: queryKeys.debts("paid_off") }),
    queryClient.invalidateQueries({ queryKey: ["timeline"], refetchType: "active" }),
    queryClient.invalidateQueries({ queryKey: ["planning", "projection"], refetchType: "active" }),
  ]);
}
