import type { Clock } from "@/domain/ports/clock.port";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import { buildDefaultWallet } from "@/domain/services/default-wallet.factory";

export interface EnsureDefaultWalletDeps {
  assets: Pick<AssetRepository, "findActiveByUserAndCategory" | "create">;
  clock: Clock;
  newId: () => string;
}

/**
 * Garante que o usuário tenha pelo menos uma conta cash (a "Carteira", o balde).
 * Idempotente: se já existe qualquer ativo cash, não faz nada. Senão cria a
 * Carteira padrão com saldo zero. Chamado na entrada do app pra cobrir usuários
 * novos e existentes sem precisar de migration.
 */
export async function ensureDefaultWallet(
  deps: EnsureDefaultWalletDeps,
  userId: string,
): Promise<void> {
  const existing = await deps.assets.findActiveByUserAndCategory(userId, "cash");
  if (existing.length > 0) return;
  const wallet = buildDefaultWallet(userId, deps.newId(), deps.clock.now());
  await deps.assets.create(wallet);
}
