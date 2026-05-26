export interface UsageSummary {
  dau: number;
  wau: number;
  mau: number;
  avgDailyActiveSeconds30d: number; // mean activeSeconds per (user,day) row in last 30d
}

export interface UserUsage {
  activeSeconds30d: number;
  lastSeenAt: Date | null;
}

export interface TopUserUsage {
  userId: string;
  email: string;
  activeSeconds30d: number;
  lastSeenAt: Date | null;
}

export interface UsageRepository {
  recordPing(userId: string, path: string | null, now: Date): Promise<void>;
  getSummary(now: Date): Promise<UsageSummary>;
  getUserUsage(userId: string, now: Date): Promise<UserUsage>;
  getUserUsageMap(userIds: string[], now: Date): Promise<Map<string, UserUsage>>;
  listTopUsers(now: Date, limit: number): Promise<TopUserUsage[]>;
}
