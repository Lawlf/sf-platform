"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAsset } from "@/application/use-cases/asset/create-asset.use-case";
import { updateAsset } from "@/application/use-cases/asset/update-asset.use-case";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetDebtAllocationRepository } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors";

// ---- Types ----

export interface RegisterLoanCashInflowDeps {
  assets: AssetRepository;
  allocations: AssetDebtAllocationRepository;
  debts: DebtRepository;
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
      return { ok: false, message: "Conta nao encontrada." };
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
    principalCents: z.string().regex(/^\d+$/, "Principal invalido."),
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

export type RegisterLoanCashInflowActionResult =
  | { ok: true; cashAssetId: string | null }
  | { ok: false; message: string };

// Server action wrapper — chamado pelo form apos createDebtAction ter sucesso.
// Se falhar, o caller loga aviso; a divida NAO e revertida (orphan-tolerant).
export async function registerLoanCashInflowAction(
  raw: RegisterLoanCashInflowActionInput,
): Promise<RegisterLoanCashInflowActionResult> {
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };
  }
  const v = parsed.data;

  const user = await requireUser();

  const principalCents = BigInt(v.principalCents);
  const newCashAssetCurrentBalanceCents =
    v.newCashAssetCurrentBalanceCents !== undefined
      ? BigInt(v.newCashAssetCurrentBalanceCents)
      : undefined;

  const deps: RegisterLoanCashInflowDeps = {
    assets: new DrizzleAssetRepository(),
    allocations: new DrizzleAssetDebtAllocationRepository(),
    debts: new DrizzleDebtRepository(),
    clock: new SystemClock(),
  };

  const result = await registerLoanCashInflow(deps, {
    userId: user.id,
    cashTarget: v.cashTarget,
    principalCents,
    ...(v.existingCashAssetId !== undefined ? { existingCashAssetId: v.existingCashAssetId } : {}),
    ...(v.newCashAssetName !== undefined ? { newCashAssetName: v.newCashAssetName } : {}),
    ...(newCashAssetCurrentBalanceCents !== undefined ? { newCashAssetCurrentBalanceCents } : {}),
  });

  if (result.ok) {
    revalidatePath("/app");
    revalidatePath("/app/dividas");
    revalidatePath(`/app/dividas/${v.debtId}`);
    revalidatePath("/app/patrimonio");
    revalidatePath("/app/linha-do-tempo");
    revalidatePath("/app/notificacoes");
    if (result.cashAssetId) {
      revalidatePath(`/app/patrimonio/${result.cashAssetId}`);
    }
  }

  return result;
}
