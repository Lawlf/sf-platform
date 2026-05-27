import type { Clock } from "@/domain/ports/clock.port";
import type { ModuleProgressRepository } from "@/domain/ports/repositories/module-progress.repository";
import type { UserRepository } from "@/domain/ports/repositories/user.repository";
import { UserNotFound } from "@/domain/errors/auth-errors";
import { DomainError } from "@/shared/errors/domain-error";
import { err, ok, type Result } from "@/shared/errors/result";

export interface CompleteModuleInput {
  userId: string;
  trilhaSlug: string;
  moduleNum: number;
}

export interface CompleteModuleDeps {
  users: Pick<UserRepository, "findById">;
  progress: ModuleProgressRepository;
  clock: Clock;
}

export class ModuleCompletionForbiddenForFree extends DomainError {
  readonly code = "MODULE_COMPLETION_FORBIDDEN_FOR_FREE" as const;

  constructor(message = "Apenas usuários Pro podem concluir módulos da trilha.") {
    super(message);
  }
}

export async function completeModule(
  deps: CompleteModuleDeps,
  input: CompleteModuleInput,
): Promise<Result<void, DomainError>> {
  const user = await deps.users.findById(input.userId);
  if (!user) return err(new UserNotFound("Usuário não encontrado."));
  if (!user.isPro) return err(new ModuleCompletionForbiddenForFree());

  await deps.progress.markCompleted({
    userId: input.userId,
    trilhaSlug: input.trilhaSlug,
    moduleNum: input.moduleNum,
    completedAt: deps.clock.now(),
  });
  return ok(undefined);
}
