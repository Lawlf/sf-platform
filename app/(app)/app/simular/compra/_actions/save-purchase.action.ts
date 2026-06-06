"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAsset } from "@/application/use-cases/asset/create-asset.use-case";
import type { AssetCategory, AssetMetadata } from "@/domain/entities/asset.entity";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { awardEventAchievement } from "../../../_actions/_achievements";

/**
 * Batch 6 (Plano 9 - Compra Inteligente).
 *
 * v1 simplificado: somente o caminho "à vista" está habilitado. Ele cria
 * um ativo (`AssetEntity`) com configuração de depreciação a partir dos
 * dados informados. Compras pontuais (sem parcelamento) não geram mais um
 * compromisso financeiro, pois o kind `one_off` foi removido do modelo.
 * O fluxo futuro de "compra pontual" voltará como uma intent na home.
 *
 * O caminho "cartão parcelado" cria uma dívida do tipo cartão com N parcelas
 * e fica adiado para v2. Hoje o input rejeita qualquer valor diferente de
 * `cash` e a UI desabilita o radio correspondente.
 */

const schema = z.object({
  // Asset
  assetLabel: z.string().min(1).max(120),
  assetCategory: z.enum(["vehicle", "real_estate", "investment", "cash", "other"]),
  amountCents: z.coerce.bigint().positive(),
  depreciationKind: z.enum(["appreciating", "stable", "depreciating", "consumable"]),
  depreciationRatePctYear: z.coerce.number().min(-50).max(100),
  purchaseDate: z.string().min(1),
  // Categoria informativa da compra (mantida no payload por compatibilidade
  // com a UI atual, embora não seja mais persistida em um compromisso).
  expenseCategory: z
    .enum([
      "housing",
      "utilities",
      "food",
      "transport",
      "health",
      "leisure",
      "subscriptions",
      "education",
      "other",
    ])
    .optional(),
  // v1 aceita somente "cash" (à vista). O radio "card" (parcelado) está
  // desabilitado na UI e marcado como "Em breve".
  paymentMethod: z.enum(["cash"]),
});

export type SavePurchaseResult = { ok: true; assetId: string } | { ok: false; message: string };

export async function savePurchaseAction(formData: FormData): Promise<SavePurchaseResult> {
  const parsed = schema.safeParse({
    assetLabel: formData.get("assetLabel"),
    assetCategory: formData.get("assetCategory"),
    amountCents: formData.get("amountCents"),
    depreciationKind: formData.get("depreciationKind"),
    depreciationRatePctYear: formData.get("depreciationRatePctYear"),
    purchaseDate: formData.get("purchaseDate"),
    expenseCategory: formData.get("expenseCategory"),
    paymentMethod: formData.get("paymentMethod"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const user = await requireUser();

  const purchaseDate = new Date(parsed.data.purchaseDate);
  if (Number.isNaN(purchaseDate.getTime())) {
    return { ok: false, message: "Data da compra inválida." };
  }

  // 1. Cria o ativo (sem alocações; é uma compra à vista).
  const assetResult = await createAsset(
    {
      assets: new DrizzleAssetRepository(),
      allocations: new DrizzleAssetDebtAllocationRepository(),
      debts: new DrizzleDebtRepository(),
      clock: new SystemClock(),
    },
    {
      userId: user.id,
      category: parsed.data.assetCategory,
      label: parsed.data.assetLabel,
      currentValueCents: parsed.data.amountCents,
      currency: "BRL",
      metadata: assetMetadataForCategory(parsed.data.assetCategory),
      fipeCode: null,
      acquiredAt: purchaseDate,
      allocations: [],
      depreciationKind: parsed.data.depreciationKind,
      depreciationRatePctYear: parsed.data.depreciationRatePctYear,
      purchaseDate,
    },
  );

  if (!isOk(assetResult)) {
    return { ok: false, message: assetResult.error.message ?? "Erro ao criar ativo." };
  }

  const assetId = assetResult.value.id;

  // v1: somente o ativo é criado. O antigo registro de compromisso pontual
  // foi removido junto com o kind `one_off` do modelo de dívidas.

  revalidatePath("/app/patrimonio");
  revalidatePath("/app/dividas");
  revalidatePath("/app");

  await awardEventAchievement(user.id, "mapa-do-tesouro");

  return { ok: true, assetId };
}

/**
 * Gera um metadata mínimo válido por categoria. Os campos opcionais são
 * omitidos quando não temos contexto suficiente vindo da simulação.
 */
function assetMetadataForCategory(category: AssetCategory): AssetMetadata | null {
  switch (category) {
    case "vehicle":
      // O usuário ainda não preencheu marca/modelo/ano na simulação. Para evitar
      // metadata inválido, devolvemos null e o usuário pode editar depois.
      return null;
    case "real_estate":
      return null;
    case "investment":
      return null;
    case "cash":
      return { kind: "cash" };
    case "other":
      return { kind: "other" };
    default:
      return null;
  }
}
