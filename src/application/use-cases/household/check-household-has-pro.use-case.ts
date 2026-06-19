import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import type { UserRepositoryPort } from "@/domain/ports/repositories/user.repository";

export interface CheckHouseholdHasProDeps {
  households: Pick<HouseholdRepositoryPort, "listMembers">;
  users: Pick<UserRepositoryPort, "findById">;
}

export interface CheckHouseholdHasProInput {
  householdId: string;
}

export async function checkHouseholdHasPro(
  deps: CheckHouseholdHasProDeps,
  input: CheckHouseholdHasProInput,
): Promise<boolean> {
  const members = await deps.households.listMembers(input.householdId);
  const users = await Promise.all(members.map((m) => deps.users.findById(m.userId)));
  return users.some((u) => u?.isPro === true);
}
