import type { TopUserUsage, UsageSummary } from "@/domain/ports/repositories/usage.repository";
import { DrizzleUsageRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-usage.repository";

function repo() {
  return new DrizzleUsageRepository();
}

export async function getUsageSummary(): Promise<UsageSummary> {
  return repo().getSummary(new Date());
}

export async function getTopUsers(limit = 10): Promise<TopUserUsage[]> {
  return repo().listTopUsers(new Date(), limit);
}
