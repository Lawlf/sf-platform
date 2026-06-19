import type { RegisterDebtDeps } from "@/application/use-cases/debt/register-debt.use-case";
import { registerDebt } from "@/application/use-cases/debt/register-debt.use-case";
import type { ProfileEntity } from "@/domain/entities/profile.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { ProfileRepositoryPort } from "@/domain/ports/repositories/profile.repository";
import { ok, type Result } from "@/shared/errors/result";

export interface CreateMeiProfileDeps extends RegisterDebtDeps {
  profiles: ProfileRepositoryPort;
  clock: Clock;
}

export interface CreateMeiProfileInput {
  userId: string;
}

export interface CreateMeiProfileResult {
  pf: ProfileEntity;
  pj: ProfileEntity;
}

export async function createMeiProfile(
  deps: CreateMeiProfileDeps,
  input: CreateMeiProfileInput,
): Promise<Result<CreateMeiProfileResult, never>> {
  const now = deps.clock.now();

  const pf = await deps.profiles.ensurePfProfile(input.userId, now);

  if (pf.linkedProfileId) {
    const linked = await deps.profiles.findById(pf.linkedProfileId);
    if (linked && linked.type === "PJ_MEI") {
      return ok({ pf, pj: linked });
    }
  }

  const pj = await deps.profiles.create({
    userId: input.userId,
    type: "PJ_MEI",
    linkedProfileId: pf.id,
    displayName: null,
    isPrimary: false,
    taxClassification: "mei",
    now,
  });

  await deps.profiles.setLinkedProfile(pf.id, pj.id);

  await registerDebt(deps, {
    kind: "recurring",
    userId: input.userId,
    profileId: pj.id,
    label: "DAS",
    recurringFrequency: "monthly",
    recurringAmountCents: 7690n,
    expenseCategory: "das-mei",
    startDate: now,
    dueDay: 20,
  });

  return ok({ pf, pj });
}
