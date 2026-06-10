"use server";

import { z } from "zod";

import { createAsset } from "@/application/use-cases/asset/create-asset.use-case";
import { updateAsset } from "@/application/use-cases/asset/update-asset.use-case";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetDebtAllocationRepositoryPort } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { clock, repos } from "@/infrastructure/container";
import { action, ActionError } from "@/presentation/actions/action";
import { isOk } from "@/shared/errors/result";

// ---- Types ----

export interface RegisterLoanCashInflowDeps {
  assets: AssetRepositoryPort;
  allocations: AssetDebtAllocationRepositoryPort;
  debts: DebtRepositoryPort;
  clock: Clock;
}

export type LoanCashTarget = "existing" | "new" | "spent";

export interface RegisterLoanCashInflowInput {
  userId: string;
  cashTarget: LoanCashTarget;
  principalCents: bigint;
  existingCashAssetId?: string | undefined;
  newCashAssetName?: string | undefined;
  newCashAssetCurrentBalanceCents?: bigint | undefined;
}

export type RegisterLoanCashInflowResult =
  | { ok: true; cashAssetId: string | null }
  | { ok: false; message: string };

// ---- Pure orchestrator (tested directly) ----

export async function registerLoanCashInflow(
  deps: RegisterLoanCashInflowDeps,
  input: RegisterLoanCashInflowInput,
): Promise<RegisterLoanCashInflowResult> {
  if (input.cashTarget === "spent") {
    return { ok: true, cashAssetId: null };
  }

  if (input.cashTarget === "existing") {
    if (!input.existingCashAssetId) {
      return { ok: false, message: "Escolha a conta onde o dinheiro caiu." };
    }
    const asset = await deps.assets.findById(input.existingCashAssetId, input.userId);
    if (!asset) {
      return { ok: false, message: "Conta não encontrada." };
    }
    const nextValueCents = asset.currentValue.toCents() + input.principalCents;
    const updateResult = await updateAsset(
      { assets: deps.assets, clock: deps.clock },
      {
        userId: input.userId,
        assetId: asset.id,
        currentValueCents: nextValueCents,
      },
    );
    if (!isOk(updateResult)) {
      return { ok: false, message: updateResult.error.message ?? "Erro ao atualizar conta." };
    }
    return { ok: true, cashAssetId: asset.id };
  }

  // cashTarget === "new"
  const rawName = (input.newCashAssetName ?? "").trim();
  if (rawName.length === 0) {
    return { ok: false, message: "Informe o nome da conta." };
  }
  const balanceBefore = input.newCashAssetCurrentBalanceCents ?? 0n;
  const totalCents = balanceBefore + input.principalCents;

  const createResult = await createAsset(
    {
      assets: deps.assets,
      allocations: deps.allocations,
      debts: deps.debts,
      clock: deps.clock,
    },
    {
      userId: input.userId,
      category: "cash",
      label: rawName,
      currentValueCents: totalCents,
      currency: "BRL",
      metadata: { kind: "cash", yieldType: "none" },
      fipeCode: null,
      acquiredAt: deps.clock.now(),
      allocations: [],
      depreciationKind: "stable",
      depreciationRatePctYear: 0,
      purchaseDate: null,
      purchasePriceCents: null,
    },
  );
  if (!isOk(createResult)) {
    return { ok: false, message: createResult.error.message ?? "Erro ao criar conta." };
  }
  return { ok: true, cashAssetId: createResult.value.id };
}

// ---- Zod schema for server action call ----

const actionSchema = z
  .object({
    debtId: z.string().uuid(),
    cashTarget: z.enum(["existing", "new", "spent"]),
    principalCents: z.string().regex(/^\d+$/, "Principal inválido."),
    existingCashAssetId: z.string().uuid().optional(),
    newCashAssetName: z.string().min(1).max(120).optional(),
    newCashAssetCurrentBalanceCents: z.string().regex(/^\d+$/).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.cashTarget === "existing" && !v.existingCashAssetId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Escolha a conta onde o dinheiro caiu.",
        path: ["existingCashAssetId"],
      });
    }
    if (v.cashTarget === "new" && (!v.newCashAssetName || v.newCashAssetName.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o nome da conta.",
        path: ["newCashAssetName"],
      });
    }
  });

export type RegisterLoanCashInflowActionInput = z.input<typeof actionSchema>;

export const registerLoanCashInflowAction = action({
  schema: actionSchema,
  revalidates: ["home", "debts", "assets", "timeline", "notifications"],
  handler: async (v, { userId }) => {
    const principalCents = BigInt(v.principalCents);
    const newCashAssetCurrentBalanceCents =
      v.newCashAssetCurrentBalanceCents !== undefined
        ? BigInt(v.newCashAssetCurrentBalanceCents)
        : undefined;

    const deps: RegisterLoanCashInflowDeps = {
      assets: repos.assets,
      allocations: repos.assetDebtAllocations,
      debts: repos.debts,
      clock,
    };

    const result = await registerLoanCashInflow(deps, {
      userId,
      cashTarget: v.cashTarget,
      principalCents,
      ...(v.existingCashAssetId !== undefined
        ? { existingCashAssetId: v.existingCashAssetId }
        : {}),
      ...(v.newCashAssetName !== undefined ? { newCashAssetName: v.newCashAssetName } : {}),
      ...(newCashAssetCurrentBalanceCents !== undefined
        ? { newCashAssetCurrentBalanceCents }
        : {}),
    });

    if (!result.ok) throw new ActionError(result.message);
    return { cashAssetId: result.cashAssetId };
  },
  revalidatePaths: (data, v) => [
    `/app/dividas/${v.debtId}`,
    ...(data.cashAssetId ? [`/app/patrimonio/${data.cashAssetId}`] : []),
  ],
});
