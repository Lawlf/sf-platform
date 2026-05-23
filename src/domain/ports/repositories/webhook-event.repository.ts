export interface WebhookEventRepository {
  /**
   * Insere evento idempotentemente. Retorna `true` se foi inserido
   * (evento novo), `false` se ja existia (replay).
   *
   * Implementacao Drizzle usa `INSERT ... ON CONFLICT (id) DO NOTHING`.
   */
  recordIfNew(id: string, type: string, payload: unknown): Promise<boolean>;

  /**
   * Remove o marcador de evento processado. Chamar quando o handler
   * falha, para permitir que o retry (QStash/Stripe) reprocesse.
   */
  deleteById(id: string): Promise<void>;
}
