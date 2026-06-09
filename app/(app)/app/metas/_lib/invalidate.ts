import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../_lib/query-keys";

// Criar/editar/arquivar/excluir meta muda os ETAs que a curva de projeção
// renderiza por nome (`["planning","projection"]`) e pode mexer na cascata da
// timeline. A lista de metas em si é RSC (revalidatePath cuida). `refetchType:
// "active"` só refaz o que está montado.
export async function invalidateGoalCaches(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["planning", "projection"], refetchType: "active" }),
    queryClient.invalidateQueries({ queryKey: ["timeline"], refetchType: "active" }),
  ]);
}

// Um aporte muta a reserva (ativo) + progresso da meta, então além da projeção
// precisamos atualizar patrimônio, saldo da carteira e os cards de macro.
export async function invalidateContributionCaches(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.assetsWithAllocations }),
    queryClient.invalidateQueries({ queryKey: queryKeys.netWorth }),
    queryClient.invalidateQueries({ queryKey: queryKeys.walletBalance }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot }),
    queryClient.invalidateQueries({ queryKey: ["planning", "projection"], refetchType: "active" }),
    queryClient.invalidateQueries({ queryKey: ["timeline"], refetchType: "active" }),
  ]);
}
