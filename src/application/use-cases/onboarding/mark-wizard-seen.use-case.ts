import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import type { DomainError } from "@/shared/errors/domain-error";
import { ok, type Result } from "@/shared/errors/result";

export interface MarkWizardSeenDeps {
  users: UserRepositoryPort;
}

export interface MarkWizardSeenInput {
  userId: string;
}

export async function markWizardSeen(
  deps: MarkWizardSeenDeps,
  input: MarkWizardSeenInput,
): Promise<Result<void, DomainError>> {
  await deps.users.markOnboardingWizardSeen(input.userId);
  return ok(undefined);
}
