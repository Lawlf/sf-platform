import type { HouseholdEntity } from "@/domain/entities/household.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { ok, type Result } from "@/shared/errors/result";

export interface CreateHouseholdDeps {
  households: HouseholdRepositoryPort;
  clock: Clock;
}

export interface CreateHouseholdInput {
  userId: string;
  name: string;
}

export async function createHousehold(
  deps: CreateHouseholdDeps,
  input: CreateHouseholdInput,
): Promise<Result<HouseholdEntity, never>> {
  const now = deps.clock.now();
  const id = crypto.randomUUID();

  const household = await deps.households.createHousehold({
    id,
    name: input.name,
    createdByUserId: input.userId,
    now,
  });

  await deps.households.addMember({
    householdId: id,
    userId: input.userId,
    role: "admin",
    now,
  });

  return ok(household);
}
