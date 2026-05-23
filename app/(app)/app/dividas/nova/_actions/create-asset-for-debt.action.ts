"use server";

import { z } from "zod";

import { createAsset } from "@/application/use-cases/asset/create-asset.use-case";
import type { AssetMetadata } from "@/domain/entities/asset.entity";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors";

const inputSchema = z.object({
  category: z.enum(["vehicle", "real_estate", "other"]),
  label: z.string().min(1, "Informe o nome do bem.").max(120, "Máximo de 120 caracteres."),
  currentValueCents: z.string().regex(/^\d+$/, "Valor inválido."),
  acquiredAt: z.string().nullable().optional(),
});

export type CreateAssetForDebtInput = z.input<typeof inputSchema>;

export type CreateAssetForDebtResult =
  | { ok: true; assetId: string }
  | { ok: false; message: string };

// Cria um ativo "mínimo" a partir do wizard de dívida (inverso de createDebtForAsset).
// Usado quando o usuário marca "Sim, vou cadastrar agora" no passo "Esse compromisso é
// por causa de um bem?". O ativo é criado sem alocações; o vínculo com a dívida é feito
// em um segundo passo (linkDebtToAssetAction) após a dívida existir.
export async function createAssetForDebtAction(
  raw: CreateAssetForDebtInput,
): Promise<CreateAssetForDebtResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const user = await requireUser();
  const v = parsed.data;

  let currentValueCents: bigint;
  try {
    currentValueCents = BigInt(v.currentValueCents);
  } catch {
    return { ok: false, message: "Valor inválido." };
  }
  if (currentValueCents < 0n) {
    return { ok: false, message: "Valor do bem não pode ser negativo." };
  }

  const acquiredAt = v.acquiredAt && v.acquiredAt.length > 0 ? new Date(v.acquiredAt) : null;
  if (acquiredAt && Number.isNaN(acquiredAt.getTime())) {
    return { ok: false, message: "Data inválida." };
  }

  // Metadata mínima por categoria. Para vehicle/real_estate, deixamos placeholders
  // genéricos que o usuário pode refinar depois no detalhe do ativo.
  let metadata: AssetMetadata | null = null;
  if (v.category === "vehicle") {
    metadata = {
      kind: "vehicle",
      brand: "-",
      model: v.label.trim(),
      year: new Date().getFullYear(),
    };
  } else if (v.category === "real_estate") {
    metadata = { kind: "real_estate", addressCity: "-" };
  } else {
    metadata = { kind: "other", description: v.label.trim() };
  }

  // Defaults sensatos de depreciação por categoria.
  const depreciationKind: "appreciating" | "stable" | "depreciating" =
    v.category === "real_estate"
      ? "appreciating"
      : v.category === "vehicle"
        ? "depreciating"
        : "stable";
  const depreciationRatePctYear =
    v.category === "vehicle" ? 15 : v.category === "real_estate" ? -3 : 0;

  const result = await createAsset(
    {
      assets: new DrizzleAssetRepository(),
      allocations: new DrizzleAssetDebtAllocationRepository(),
      debts: new DrizzleDebtRepository(),
      clock: new SystemClock(),
    },
    {
      userId: user.id,
      category: v.category,
      label: v.label.trim(),
      currentValueCents,
      metadata,
      fipeCode: null,
      acquiredAt,
      allocations: [],
      depreciationKind,
      depreciationRatePctYear,
      purchaseDate: acquiredAt,
      purchasePriceCents: currentValueCents > 0n ? currentValueCents : null,
    },
  );

  if (!isOk(result)) {
    return { ok: false, message: result.error.message ?? "Erro ao criar bem." };
  }
  return { ok: true, assetId: result.value.id };
}
