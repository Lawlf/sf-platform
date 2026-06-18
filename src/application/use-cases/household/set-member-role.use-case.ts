import { Forbidden } from "@/domain/errors/auth-errors";
import { HouseholdLastAdminError, HouseholdNotMember } from "@/domain/errors/household-errors";
import type { HouseholdRole } from "@/domain/entities/household.entity";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import { hasAdmin } from "@/domain/services/household/household-membership.service";
import { err, ok, type Result } from "@/shared/errors/result";

export interface SetMemberRoleDeps {
  households: HouseholdRepositoryPort;
}

export interface SetMemberRoleInput {
  householdId: string;
  adminUserId: string;
  targetUserId: string;
  role: HouseholdRole;
}

export async function setMemberRole(
  deps: SetMemberRoleDeps,
  input: SetMemberRoleInput,
): Promise<Result<void, Forbidden | HouseholdNotMember | HouseholdLastAdminError>> {
  const adminMembership = await deps.households.findMembership(
    input.householdId,
    input.adminUserId,
  );
  if (!adminMembership || adminMembership.role !== "admin") {
    return err(new Forbidden("Apenas administradores podem alterar papéis."));
  }

  const targetMembership = await deps.households.findMembership(
    input.householdId,
    input.targetUserId,
  );
  if (!targetMembership) {
    return err(new HouseholdNotMember("Este usuário não faz parte do lar."));
  }

  if (input.role === "member" && targetMembership.role === "admin") {
    const members = await deps.households.listMembers(input.householdId);
    const remainingAfterDowngrade = members.map((m) =>
      m.userId === input.targetUserId ? { ...m, role: "member" as HouseholdRole } : m,
    );
    if (!hasAdmin(remainingAfterDowngrade)) {
      return err(new HouseholdLastAdminError("O lar precisa de pelo menos um admin."));
    }
  }

  await deps.households.setRole(input.householdId, input.targetUserId, input.role);

  return ok(undefined);
}
