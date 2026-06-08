export interface LiteUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface UserActivityRepository {
  /**
   * Marca o usuário como ativo agora. Throttled: só escreve se `last_active_at`
   * estiver mais velho que `staleAfterMs` (evita 1 write por request).
   */
  touchLastActive(userId: string, now: Date, staleAfterMs: number): Promise<void>;
  /**
   * Usuários ativos (não desativados) com `last_active_at >= since`. Usado pelo
   * lembrete mensal, que só faz sentido pra quem ainda usa o app.
   */
  findActiveSince(since: Date): Promise<LiteUser[]>;
  /**
   * Usuários ativos (não desativados) cujo `last_active_at` cai em [start, end).
   * Usado pelo cron de inatividade.
   */
  findLapsed(start: Date, end: Date): Promise<LiteUser[]>;
  /**
   * Free, ativos, com conta criada antes de `createdBefore` e ativos desde
   * `activeSince`. Usado pelo cron de upsell (engajado mas ainda não Pro).
   */
  findEngagedFreeUsers(opts: { activeSince: Date; createdBefore: Date }): Promise<LiteUser[]>;
}
