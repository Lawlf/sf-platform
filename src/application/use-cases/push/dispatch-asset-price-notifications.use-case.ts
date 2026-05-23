import type { UserRepository } from "@/domain/ports/repositories/user.repository";

import type { SendPushToUserDeps } from "./send-push-to-user.use-case";

export interface DispatchAssetPriceDeps extends SendPushToUserDeps {
  users: UserRepository;
}

export interface DispatchAssetPriceResult {
  pushesSent: number;
  note: string;
}

/**
 * Placeholder. Lógica real precisa de detector de variação significativa
 * (ex: ação > 5% no dia) integrado com o cron de cotações já existente.
 * Por agora retorna 0 — switch existe no UI mas não dispara.
 *
 * Implementação futura: comparar fechamento de hoje vs ontem por ticker,
 * pra cada ativo do user, dispara push quando |variação| >= threshold.
 */
export async function dispatchAssetPriceNotifications(
  _deps: DispatchAssetPriceDeps,
): Promise<DispatchAssetPriceResult> {
  return {
    pushesSent: 0,
    note: "asset-price detector não implementado; aguarda integração com cron de cotações",
  };
}
