import type { ContentDiagnosticAnswer } from "@/domain/entities/user.entity";
import { UserNotFound } from "@/domain/errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { UserRepository } from "@/domain/ports/repositories/user.repository";
import { DomainError, err, ok, type Result } from "@/shared/errors";

export interface SaveDiagnosticAnswerInput {
  userId: string;
  answer: ContentDiagnosticAnswer;
}

export interface SaveDiagnosticAnswerDeps {
  users: UserRepository;
  clock: Clock;
}

export class DiagnosticForbiddenForFree extends DomainError {
  readonly code = "DIAGNOSTIC_FORBIDDEN_FOR_FREE" as const;

  constructor(message = "Apenas usuários Pro podem salvar a trilha de conteúdo.") {
    super(message);
  }
}

export async function saveDiagnosticAnswer(
  deps: SaveDiagnosticAnswerDeps,
  input: SaveDiagnosticAnswerInput,
): Promise<Result<void, DomainError>> {
  const user = await deps.users.findById(input.userId);
  if (!user) return err(new UserNotFound("Usuário não encontrado."));
  if (!user.isPro) return err(new DiagnosticForbiddenForFree());

  const now = deps.clock.now();
  const updated = {
    ...user,
    contentDiagnosticAnswer: input.answer,
    contentDiagnosticAnsweredAt: now,
    updatedAt: now,
  };
  await deps.users.update(updated);
  return ok(undefined);
}
