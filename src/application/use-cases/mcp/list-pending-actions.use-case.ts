import type { Clock } from "@/domain/ports/clock.port";
import type {
  McpPendingAction,
  McpPendingActionRepository,
} from "@/domain/ports/repositories/mcp-pending-action.repository";

export interface ListPendingActionsDeps {
  pending: McpPendingActionRepository;
  clock: Clock;
}

export interface ListPendingActionsInput {
  userId: string;
}

export async function listPendingActions(
  deps: ListPendingActionsDeps,
  input: ListPendingActionsInput,
): Promise<McpPendingAction[]> {
  const now = deps.clock.now();
  const all = await deps.pending.listPendingForUser(input.userId);
  return all.filter((p) => p.expiresAt.getTime() > now.getTime());
}
