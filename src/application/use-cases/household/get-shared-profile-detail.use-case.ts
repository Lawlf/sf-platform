import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { Forbidden } from "@/domain/errors/auth-errors";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { HouseholdRepositoryPort } from "@/domain/ports/repositories/household.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import { err, ok, type Result } from "@/shared/errors/result";

export interface GetSharedProfileDetailDeps {
  households: HouseholdRepositoryPort;
  incomes: IncomeRepositoryPort;
  debts: DebtRepositoryPort;
}

export interface GetSharedProfileDetailInput {
  householdId: string;
  userId: string;
  profileId: string;
}

export interface SharedProfileDetail {
  incomes: IncomeEntity[];
  debts: DebtEntity[];
}

export async function getSharedProfileDetail(
  deps: GetSharedProfileDetailDeps,
  input: GetSharedProfileDetailInput,
): Promise<Result<SharedProfileDetail, Forbidden>> {
  const membership = await deps.households.findMembership(input.householdId, input.userId);
  if (!membership) {
    return err(new Forbidden("Você não faz parte deste lar."));
  }

  const shared = await deps.households.findSharedProfile(input.householdId, input.profileId);
  if (!shared || shared.shareLevel !== "detail") {
    return err(new Forbidden("Esse perfil não está disponível para detalhe."));
  }

  const ownerMembership = await deps.households.findMembership(input.householdId, shared.userId);
  if (!ownerMembership) {
    return err(new Forbidden("Esse perfil não está disponível para detalhe."));
  }

  const [incomes, debts] = await Promise.all([
    deps.incomes.listForProfile(input.profileId),
    deps.debts.listForProfile(input.profileId, { status: "all" }),
  ]);

  return ok({ incomes, debts });
}
