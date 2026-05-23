"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAsset } from "@/application/use-cases/asset/create-asset.use-case";
import type { AssetMetadata } from "@/domain/entities/asset.entity";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors";

const allocSchema = z.object({
  debtId: z.string().uuid(),
  allocationOriginalCents: z.string().regex(/^\d+$/, "Alocação inválida."),
});

const inputSchema = z.object({
  category: z.enum(["vehicle", "real_estate", "investment", "cash", "other"]),
  label: z.string().min(1).max(120),
  currentValueCents: z.string().regex(/^-?\d+$/, "Valor inválido."),
  metadataJson: z.string().nullable(),
  acquiredAt: z.string().nullable(),
  allocations: z.array(allocSchema),
  depreciationKind: z
    .enum(["appreciating", "stable", "depreciating", "consumable"])
    .default("stable"),
  depreciationRatePctYear: z.coerce.number().min(-50).max(100).default(0),
  purchaseDate: z.string().optional().nullable(),
  purchasePriceCents: z
    .string()
    .regex(/^-?\d+$/, "Preço de compra inválido.")
    .nullable()
    .optional(),
});

export type CreateAssetResult = { ok: true; assetId: string } | { ok: false; message: string };

export async function createAssetAction(formInput: unknown): Promise<CreateAssetResult> {
  const parsed = inputSchema.safeParse(formInput);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const user = await requireUser();

  let metadata: AssetMetadata | null = null;
  if (parsed.data.metadataJson !== null && parsed.data.metadataJson.length > 0) {
    try {
      metadata = JSON.parse(parsed.data.metadataJson) as AssetMetadata;
    } catch {
      return { ok: false, message: "Metadados inválidos." };
    }
  }
  const acquiredAt = parsed.data.acquiredAt ? new Date(parsed.data.acquiredAt) : null;
  const purchaseDate =
    parsed.data.purchaseDate && parsed.data.purchaseDate.length > 0
      ? new Date(parsed.data.purchaseDate)
      : null;

  const currentValueCents = BigInt(parsed.data.currentValueCents);
  if (currentValueCents < 0n) {
    return { ok: false, message: "Valor do ativo não pode ser negativo." };
  }

  let purchasePriceCents: bigint | null = null;
  if (parsed.data.purchasePriceCents !== undefined && parsed.data.purchasePriceCents !== null) {
    try {
      const p = BigInt(parsed.data.purchasePriceCents);
      if (p < 0n) {
        return { ok: false, message: "Preço de compra não pode ser negativo." };
      }
      purchasePriceCents = p > 0n ? p : null;
    } catch {
      return { ok: false, message: "Preço de compra inválido." };
    }
  }

  const allocations = parsed.data.allocations
    .map((a) => ({
      debtId: a.debtId,
      allocationOriginalCents: BigInt(a.allocationOriginalCents),
    }))
    .filter((a) => a.allocationOriginalCents > 0n);

  const result = await createAsset(
    {
      assets: new DrizzleAssetRepository(),
      allocations: new DrizzleAssetDebtAllocationRepository(),
      debts: new DrizzleDebtRepository(),
      clock: new SystemClock(),
    },
    {
      userId: user.id,
      category: parsed.data.category,
      label: parsed.data.label,
      currentValueCents,
      metadata,
      fipeCode: null,
      acquiredAt,
      allocations,
      depreciationKind: parsed.data.depreciationKind,
      depreciationRatePctYear: parsed.data.depreciationRatePctYear,
      purchaseDate,
      purchasePriceCents,
    },
  );

  if (!isOk(result)) {
    return { ok: false, message: result.error.message ?? "Erro ao criar ativo." };
  }
  revalidatePath(`/app/patrimonio/${result.value.id}`);
  revalidatePath("/app/patrimonio");
  revalidatePath("/app/dividas");
  revalidatePath("/app/linha-do-tempo");
  revalidatePath("/app/notificacoes");
  revalidatePath("/app");
  return { ok: true, assetId: result.value.id };
}
