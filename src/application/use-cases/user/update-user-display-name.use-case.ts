import { UserNotFound } from "@/domain/errors/auth-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import { DomainError } from "@/shared/errors/domain-error";
import { err, ok, type Result } from "@/shared/errors/result";

export interface UpdateUserDisplayNameInput {
  userId: string;
  displayName: string;
}

export interface UpdateUserDisplayNameDeps {
  users: UserRepositoryPort;
  clock: Clock;
}

export class InvalidDisplayName extends DomainError {
  readonly code = "INVALID_DISPLAY_NAME" as const;

  constructor(message = "Nome inválido.") {
    super(message);
  }
}

export async function updateUserDisplayName(
  deps: UpdateUserDisplayNameDeps,
  input: UpdateUserDisplayNameInput,
): Promise<Result<void, DomainError>> {
  const trimmed = input.displayName.trim();
  if (trimmed.length === 0 || trimmed.length > 120) {
    return err(new InvalidDisplayName());
  }
  const user = await deps.users.findById(input.userId);
  if (!user) return err(new UserNotFound("Usuário não encontrado."));
  const updated = { ...user, displayName: trimmed, updatedAt: deps.clock.now() };
  await deps.users.update(updated);
  return ok(undefined);
}
