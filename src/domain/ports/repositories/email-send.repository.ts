export interface EmailSendRepository {
  /**
   * Registra um envio. Se `dedupeKey` for informado e já existir um registro
   * com a mesma chave pro usuário, não insere e retorna `recorded: false`.
   */
  recordSend(input: {
    userId: string;
    kind: string;
    dedupeKey?: string | null;
  }): Promise<{ recorded: boolean }>;
  /** Houve algum envio pro usuário em `sent_at >= since`. */
  hasSentSince(userId: string, since: Date): Promise<boolean>;
}
