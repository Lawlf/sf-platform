import type { TopUserUsage, UsageSummary } from "@/domain/ports/repositories/usage.repository";
import { repos } from "@/infrastructure/container";

function repo() {
  return repos.usage;
}

export async function getUsageSummary(): Promise<UsageSummary> {
  return repo().getSummary(new Date());
}

export async function getTopUsers(limit = 10): Promise<TopUserUsage[]> {
  return repo().listTopUsers(new Date(), limit);
}
