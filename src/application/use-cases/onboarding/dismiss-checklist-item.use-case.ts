import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import type { DomainError } from "@/shared/errors/domain-error";
import { ok, type Result } from "@/shared/errors/result";

export interface DismissChecklistItemDeps {
  users: Pick<UserRepositoryPort, "markChecklistItemDismissed">;
}

export interface DismissChecklistItemInput {
  userId: string;
  item: "debt" | "goal";
}

export async function dismissChecklistItem(
  deps: DismissChecklistItemDeps,
  input: DismissChecklistItemInput,
): Promise<Result<void, DomainError>> {
  await deps.users.markChecklistItemDismissed(input.userId, input.item);
  return ok(undefined);
}
