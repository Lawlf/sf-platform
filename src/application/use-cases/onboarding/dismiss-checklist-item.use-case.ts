import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";
import type { DomainError } from "@/shared/errors/domain-error";
import { ok, type Result } from "@/shared/errors/result";

export interface DismissChecklistItemDeps {
  profiles: Pick<ProfileRepositoryPort, "markChecklistItemDismissed">;
}

export interface DismissChecklistItemInput {
  profileId: string;
  item: "debt" | "goal";
}

export async function dismissChecklistItem(
  deps: DismissChecklistItemDeps,
  input: DismissChecklistItemInput,
): Promise<Result<void, DomainError>> {
  await deps.profiles.markChecklistItemDismissed(input.profileId, input.item);
  return ok(undefined);
}
