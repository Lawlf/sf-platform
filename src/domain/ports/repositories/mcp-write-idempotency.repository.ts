export interface McpWriteIdempotencyRepository {
  find(connectionId: string, key: string): Promise<Record<string, unknown> | null>;
  save(connectionId: string, key: string, result: Record<string, unknown>): Promise<void>;
}
