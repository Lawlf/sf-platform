export interface WebhookEventRepository {
  /**
   * Insere evento idempotentemente. Retorna `true` se foi inserido
   * (evento novo), `false` se ja existia (replay).
   *
   * Implementacao Drizzle usa `INSERT ... ON CONFLICT (id) DO NOTHING`.
   */
  recordIfNew(id: string, type: string, payload: unknown): Promise<boolean>;
}
