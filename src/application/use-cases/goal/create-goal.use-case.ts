import type { GoalEntity, GoalFundingMode, GoalType } from "@/domain/entities/goal.entity";
import type { GoalRepository } from "@/domain/ports/repositories/goal.repository";

export interface CreateGoalDeps {
  goals: GoalRepository;
}

export interface CreateGoalInput {
  type: GoalType;
  title: string;
  targetCents?: bigint | null;
  deadline?: Date | null;
  linkedDebtId?: string | null;
  linkedAssetId?: string | null;
  targetMonths?: number | null;
  fundingMode?: GoalFundingMode | null;
  manualSavedCents?: bigint | null;
  monthlyCostCents?: bigint | null;
  realReturnPct?: number | null;
}

export type CreateGoalResult =
  | { ok: true; goal: GoalEntity }
  | { ok: false; message: string };

/**
 * Cria uma nova meta para o usuario. Usuarios Free ficam limitados a 1 meta
 * ativa; Pro nao tem limite.
 */
export async function createGoal(
  { goals }: CreateGoalDeps,
  {
    userId,
    isPro,
    input,
  }: { userId: string; isPro: boolean; input: CreateGoalInput },
): Promise<CreateGoalResult> {
  if (!isPro) {
    const active = await goals.countActive(userId);
    if (active >= 1) {
      return {
        ok: false,
        message: "No plano Free voce mantem 1 meta ativa. O Pro libera varias.",
      };
    }
  }

  const normalized = normalizeFields(input);

  const goal = await goals.create({
    id: crypto.randomUUID(),
    userId,
    status: "active",
    type: input.type,
    title: input.title,
    ...normalized,
  });

  return { ok: true, goal };
}

/**
 * Retorna somente os campos relevantes para o tipo da meta, deixando os
 * demais como null.
 */
function normalizeFields(input: CreateGoalInput): Omit<
  GoalEntity,
  "id" | "userId" | "status" | "type" | "title" | "createdAt" | "updatedAt"
> {
  const base = {
    targetCents: null,
    deadline: input.deadline ?? null,
    linkedDebtId: null,
    linkedAssetId: null,
    targetMonths: null,
    fundingMode: null,
    manualSavedCents: null,
    monthlyCostCents: null,
    realReturnPct: null,
  };

  switch (input.type) {
    case "debt_payoff":
      return { ...base, linkedDebtId: input.linkedDebtId ?? null };

    case "emergency_fund":
      return { ...base, targetMonths: input.targetMonths ?? null };

    case "savings":
      return {
        ...base,
        targetCents: input.targetCents ?? null,
        linkedAssetId: input.linkedAssetId ?? null,
        fundingMode: input.fundingMode ?? null,
        manualSavedCents: input.manualSavedCents ?? null,
      };

    case "financial_independence":
      return {
        ...base,
        monthlyCostCents: input.monthlyCostCents ?? null,
        realReturnPct: input.realReturnPct ?? null,
      };
  }
}
