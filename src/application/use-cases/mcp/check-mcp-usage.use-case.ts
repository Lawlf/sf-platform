import { McpFreeLimitReached } from "@/domain/errors/mcp-errors";
import { MCP_FREE_MONTHLY_LIMIT, mcpUsagePeriod } from "@/domain/mcp/constants";
import type { Clock } from "@/domain/ports/clock.port";
import type { McpUsageRepository } from "@/domain/ports/repositories/mcp-usage.repository";
import type { DomainError } from "@/shared/errors/domain-error";
import { err, ok, type Result } from "@/shared/errors/result";

export interface CheckMcpUsageDeps {
  usage: Pick<McpUsageRepository, "incrementAndGet">;
  clock: Clock;
}

export async function checkAndIncrementMcpUsage(
  deps: CheckMcpUsageDeps,
  input: { userId: string; isPro: boolean },
): Promise<Result<void, DomainError>> {
  if (input.isPro) return ok(undefined);
  const period = mcpUsagePeriod(deps.clock.now());
  const newCount = await deps.usage.incrementAndGet(input.userId, period);
  if (newCount > MCP_FREE_MONTHLY_LIMIT) return err(new McpFreeLimitReached());
  return ok(undefined);
}
