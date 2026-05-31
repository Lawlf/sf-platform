import type { ContentDiagnosticAnswer } from "@/domain/entities/user.entity";
import { UserNotFound } from "@/domain/errors/auth-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { UserRepository } from "@/domain/ports/repositories/user.repository";
import type { DomainError } from "@/shared/errors/domain-error";
import { err, ok, type Result } from "@/shared/errors/result";

export interface SetOnboardingFocusDeps {
  users: UserRepository;
  clock: Clock;
}

export interface SetOnboardingFocusInput {
  userId: string;
  focus: ContentDiagnosticAnswer;
}

export async function setOnboardingFocus(
  deps: SetOnboardingFocusDeps,
  input: SetOnboardingFocusInput,
): Promise<Result<void, DomainError>> {
  const user = await deps.users.findById(input.userId);
  if (!user) return err(new UserNotFound("Usuario nao encontrado."));
  const now = deps.clock.now();
  await deps.users.update({
    ...user,
    contentDiagnosticAnswer: input.focus,
    contentDiagnosticAnsweredAt: now,
    updatedAt: now,
  });
  return ok(undefined);
}
