import { UserNotFound } from "@/domain/errors/auth-errors";
import type { Clock } from "@/domain/ports/clock.port";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import { CURRENCIES, type Currency } from "@/domain/value-objects/money.vo";
import { DomainError } from "@/shared/errors/domain-error";
import { err, ok, type Result } from "@/shared/errors/result";

export interface SetBaseCurrencyInput {
  userId: string;
  currency: Currency;
}

export interface SetBaseCurrencyDeps {
  users: UserRepositoryPort;
  clock: Clock;
}

export class InvalidBaseCurrency extends DomainError {
  readonly code = "INVALID_BASE_CURRENCY" as const;

  constructor(message = "Moeda inválida.") {
    super(message);
  }
}

export async function setBaseCurrency(
  deps: SetBaseCurrencyDeps,
  input: SetBaseCurrencyInput,
): Promise<Result<void, DomainError>> {
  if (!(CURRENCIES as readonly string[]).includes(input.currency)) {
    return err(new InvalidBaseCurrency());
  }
  const user = await deps.users.findById(input.userId);
  if (!user) return err(new UserNotFound("Usuário não encontrado."));
  const updated = { ...user, baseCurrency: input.currency, updatedAt: deps.clock.now() };
  await deps.users.update(updated);
  return ok(undefined);
}
