import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import type { DomainError } from "@/shared/errors/domain-error";
import { ok, type Result } from "@/shared/errors/result";

export interface DismissHomeTourDeps {
  users: UserRepositoryPort;
}

export interface DismissHomeTourInput {
  userId: string;
}

export async function dismissHomeTour(
  deps: DismissHomeTourDeps,
  input: DismissHomeTourInput,
): Promise<Result<void, DomainError>> {
  await deps.users.markHomeTourDismissed(input.userId);
  return ok(undefined);
}
