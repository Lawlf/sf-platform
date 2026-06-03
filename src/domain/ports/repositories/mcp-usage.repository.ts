export interface McpUsageRepository {
  incrementAndGet(userId: string, period: string): Promise<number>;
  getCount(userId: string, period: string): Promise<number>;
}
