export interface McpUsageRepositoryPort {
  incrementAndGet(userId: string, period: string): Promise<number>;
  getCount(userId: string, period: string): Promise<number>;
}
