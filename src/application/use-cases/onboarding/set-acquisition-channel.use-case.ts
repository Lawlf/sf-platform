import type { AcquisitionChannel } from "@/domain/entities/user.entity";
import { UserNotFound } from "@/domain/errors/auth-errors";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";
import type { DomainError } from "@/shared/errors/domain-error";
import { err, ok, type Result } from "@/shared/errors/result";

export interface SetAcquisitionChannelDeps {
  users: UserRepositoryPort;
}

export interface SetAcquisitionChannelInput {
  userId: string;
  channel: AcquisitionChannel;
  detail?: string;
}

export async function setAcquisitionChannel(
  deps: SetAcquisitionChannelDeps,
  input: SetAcquisitionChannelInput,
): Promise<Result<void, DomainError>> {
  const user = await deps.users.findById(input.userId);
  if (!user) return err(new UserNotFound("Usuário não encontrado."));
  await deps.users.update({
    ...user,
    acquisitionChannel: input.channel,
    acquisitionChannelOther: input.channel === "other" ? (input.detail ?? null) : null,
  });
  return ok(undefined);
}
