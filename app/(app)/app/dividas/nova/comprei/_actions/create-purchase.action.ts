"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAsset } from "@/application/use-cases/asset/create-asset.use-case";
import { linkAssetToDebt } from "@/application/use-cases/asset/link-asset-to-debt.use-case";
import { updateAsset } from "@/application/use-cases/asset/update-asset.use-case";
import { registerDebt } from "@/application/use-cases/debt/register-debt.use-case";
import type { AssetEntity, AssetMetadata } from "@/domain/entities/asset.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetDebtAllocationRepository } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleAssetDebtAllocationRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset-debt-allocation.repository";
import { DrizzleAssetRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-asset.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors";

// Categorias do wizard "Comprei algo novo". Mapeadas para AssetCategory + parâmetros
// de depreciação. travel e education NÃO viram patrimônio (são gastos consumíveis).
export const PURCHASE_CATEGORY = [
  "electronics",
  "furniture",
  "vehicle",
  "travel",
  "education",
  "other",
] as const;
export type PurchaseCategory = (typeof PURCHASE_CATEGORY)[number];

export const PAYMENT_METHOD = ["cash", "credit_card", "loan", "financing"] as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[number];

// Comportamento explícito do valor do item. O usuário escolhe no Step 3 do
// wizard. Mapeado pra `DepreciationKind` da AssetEntity + sinal da taxa:
//   depreciating → kind=depreciating, rate=+annualRatePct
//   appreciating → kind=appreciating, rate=-annualRatePct (convenção da entity)
//   stable       → kind=stable, rate=0
export const VALUE_BEHAVIOR = ["depreciating", "appreciating", "stable"] as const;
export type ValueBehavior = (typeof VALUE_BEHAVIOR)[number];

// Dados opcionais para criação inline de um cartão novo no Step 3. Se omitidos
// junto com `creditCardDebtId`, o action retorna erro para credit_card.
export interface NewCreditCardInput {
  cardLabel: string;
  creditLimitCents: bigint;
  closingDay: number;
  dueDay: number;
}

export interface ExecutePurchaseInput {
  userId: string;
  name: string;
  valueCents: bigint;
  category: PurchaseCategory;
  paymentMethod: PaymentMethod;
  // value behavior (apenas relevante quando a categoria gera asset). Se
  // omitido, fallback no default da categoria (compat com testes existentes
  // e chamadas sem o novo step).
  valueBehavior?: ValueBehavior;
  annualRatePct?: number;
  // cash
  fromCashAssetId?: string | null;
  // Plan C: cash asset onboarding inline. Quando "create", criamos um novo cash
  // asset com `cashAssetName` + `currentBalanceCents` antes de aplicar a compra
  // e usamos esse asset como fonte para reduzir o saldo. "skip" deixa explícito
  // que o usuário não quer cadastrar agora. Indefinido = legacy behaviour.
  cashOnboarding?: "create" | "skip";
  cashAssetName?: string;
  currentBalanceCents?: bigint;
  // credit_card
  installments?: number;
  creditCardDebtId?: string | null;
  newCreditCard?: NewCreditCardInput | null;
  // loan
  monthlyPaymentCents?: bigint;
  // financing (casa/carro): principal = valueCents - downPaymentCents
  downPaymentCents?: bigint;
  financingAnnualRatePct?: number;
  financingTermMonths?: number;
}

export interface ExecutePurchaseDeps {
  assets: AssetRepository;
  allocations: AssetDebtAllocationRepository;
  debts: DebtRepository;
  clock: Clock;
}

export type ExecutePurchaseResult =
  | {
      ok: true;
      assetId: string | null;
      debtId: string | null;
      warning?: string;
    }
  | { ok: false; message: string };

interface CategoryConfig {
  generatesAsset: boolean;
  assetCategory: "vehicle" | "other";
  depreciationKind: "appreciating" | "stable" | "depreciating";
  depreciationRatePctYear: number;
}

const CATEGORY_CONFIG: Record<PurchaseCategory, CategoryConfig> = {
  electronics: {
    generatesAsset: true,
    assetCategory: "other",
    depreciationKind: "depreciating",
    depreciationRatePctYear: 25,
  },
  furniture: {
    generatesAsset: true,
    assetCategory: "other",
    depreciationKind: "depreciating",
    depreciationRatePctYear: 10,
  },
  vehicle: {
    generatesAsset: true,
    assetCategory: "vehicle",
    depreciationKind: "depreciating",
    depreciationRatePctYear: 15,
  },
  travel: {
    generatesAsset: false,
    assetCategory: "other",
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
  },
  education: {
    generatesAsset: false,
    assetCategory: "other",
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
  },
  other: {
    generatesAsset: true,
    assetCategory: "other",
    depreciationKind: "stable",
    depreciationRatePctYear: 0,
  },
};

// Orquestrador puro (sem `requireUser`, sem `revalidatePath`): isso aqui é o que
// os testes exercitam. O server action abaixo só monta deps + chama esta função.
export async function executePurchase(
  deps: ExecutePurchaseDeps,
  input: ExecutePurchaseInput,
): Promise<ExecutePurchaseResult> {
  if (input.valueCents <= 0n) {
    return { ok: false, message: "Informe o valor da compra." };
  }
  const name = input.name.trim();
  if (name.length === 0) {
    return { ok: false, message: "Informe o nome da compra." };
  }

  const cfg = CATEGORY_CONFIG[input.category];
  const now = deps.clock.now();

  // ---- 0) Plan C: cash asset onboarding inline ----
  // Se o usuário escolheu cadastrar a conta agora, criamos o cash asset antes
  // de tudo. O id resultante substitui `fromCashAssetId` para que o passo 4
  // (redução de saldo) reaproveite o caminho existente. Se o create falhar,
  // abortamos; sem cash asset não dá pra prosseguir com a intenção do usuário.
  let onboardedCashAssetId: string | null = null;
  if (
    input.paymentMethod === "cash" &&
    input.cashOnboarding === "create" &&
    !input.fromCashAssetId
  ) {
    const cashName = (input.cashAssetName ?? "").trim();
    if (cashName.length === 0) {
      return { ok: false, message: "Informe o nome da conta." };
    }
    if (input.currentBalanceCents === undefined || input.currentBalanceCents < 0n) {
      return { ok: false, message: "Informe o saldo atual da conta." };
    }
    const cashCreateResult = await createAsset(deps, {
      userId: input.userId,
      category: "cash",
      label: cashName,
      currentValueCents: input.currentBalanceCents,
      metadata: { kind: "cash", yieldType: "none" },
      fipeCode: null,
      acquiredAt: now,
      allocations: [],
      depreciationKind: "stable",
      depreciationRatePctYear: 0,
      purchaseDate: null,
      purchasePriceCents: null,
    });
    if (!isOk(cashCreateResult)) {
      return {
        ok: false,
        message: cashCreateResult.error.message ?? "Erro ao criar conta.",
      };
    }
    onboardedCashAssetId = cashCreateResult.value.id;
  }

  // ---- 1) Criar asset, se a categoria gera ----
  let assetId: string | null = null;
  if (cfg.generatesAsset) {
    let metadata: AssetMetadata | null;
    if (cfg.assetCategory === "vehicle") {
      metadata = {
        kind: "vehicle",
        brand: "-",
        model: name,
        year: now.getFullYear(),
      };
    } else {
      metadata = { kind: "other", description: name };
    }

    // Se o usuário escolheu manualmente o comportamento no novo Step 3, usa
    // isso. Caso contrário, cai no default da categoria. Convenção da entity:
    // rate positivo = depreciação, rate negativo = apreciação.
    let depreciationKind = cfg.depreciationKind;
    let depreciationRatePctYear = cfg.depreciationRatePctYear;
    if (input.valueBehavior !== undefined) {
      const rate = Math.abs(input.annualRatePct ?? 0);
      if (input.valueBehavior === "depreciating") {
        depreciationKind = "depreciating";
        depreciationRatePctYear = rate;
      } else if (input.valueBehavior === "appreciating") {
        depreciationKind = "appreciating";
        depreciationRatePctYear = -rate;
      } else {
        depreciationKind = "stable";
        depreciationRatePctYear = 0;
      }
    }

    const assetResult = await createAsset(deps, {
      userId: input.userId,
      category: cfg.assetCategory,
      label: name,
      currentValueCents: input.valueCents,
      metadata,
      fipeCode: null,
      acquiredAt: now,
      allocations: [],
      depreciationKind,
      depreciationRatePctYear,
      purchaseDate: now,
      purchasePriceCents: input.valueCents,
    });
    if (!isOk(assetResult)) {
      return { ok: false, message: assetResult.error.message ?? "Erro ao criar bem." };
    }
    assetId = assetResult.value.id;
  }

  // ---- 2) Criar/usar debt conforme método ----
  let debtId: string | null = null;

  if (input.paymentMethod === "credit_card") {
    const installments = input.installments ?? 1;
    if (!Number.isFinite(installments) || installments < 1 || installments > 60) {
      return { ok: false, message: "Número de parcelas inválido (1 a 60)." };
    }

    // Se o usuário escolheu cartão existente, usa-o. Senão, cria via mini-form inline.
    if (input.creditCardDebtId) {
      // Vamos lançar a compra no cartão existente: somar valueCents ao saldo atual
      // do cartão (currentStatement + currentBalance refletindo a nova compra).
      const card = await deps.debts.findById(input.creditCardDebtId);
      if (!card || card.userId !== input.userId) {
        return { ok: false, message: "Cartão não encontrado." };
      }
      if (card.kind !== "credit_card") {
        return { ok: false, message: "Dívida selecionada não é cartão de crédito." };
      }
      if (card.status !== "active") {
        return { ok: false, message: "Cartão selecionado não está ativo." };
      }
      const updated = {
        ...card,
        currentStatement: card.currentStatement.add(Money.fromCents(input.valueCents)),
        currentBalance: card.currentBalance.add(Money.fromCents(input.valueCents)),
        updatedAt: now,
      };
      await deps.debts.update(updated);
      debtId = card.id;
    } else if (input.newCreditCard) {
      const nc = input.newCreditCard;
      const cardLabel = nc.cardLabel.trim();
      if (cardLabel.length === 0) {
        return { ok: false, message: "Informe o nome do cartão." };
      }
      if (nc.creditLimitCents <= 0n) {
        return { ok: false, message: "Informe o limite do cartão." };
      }
      if (nc.closingDay < 1 || nc.closingDay > 31) {
        return { ok: false, message: "Dia de fechamento inválido." };
      }
      if (nc.dueDay < 1 || nc.dueDay > 31) {
        return { ok: false, message: "Dia de vencimento inválido." };
      }
      const debtResult = await registerDebt(deps, {
        userId: input.userId,
        label: cardLabel,
        notes: null,
        startDate: now,
        expectedEndDate: null,
        kind: "credit_card",
        creditLimit: Money.fromCents(nc.creditLimitCents),
        currentStatement: Money.fromCents(input.valueCents),
        statementDay: nc.closingDay,
        dueDay: nc.dueDay,
        revolvingBalance: null,
        revolvingMonthlyRate: null,
        installmentPurchases: [],
      });
      if (!isOk(debtResult)) {
        return { ok: false, message: "Falha ao criar cartão." };
      }
      debtId = debtResult.value.id;
    } else {
      return {
        ok: false,
        message: "Escolha um cartão existente ou cadastre um novo.",
      };
    }
  } else if (input.paymentMethod === "loan") {
    const installments = input.installments ?? 1;
    if (!Number.isFinite(installments) || installments < 1 || installments > 360) {
      return { ok: false, message: "Número de parcelas inválido (1 a 360)." };
    }
    const monthly = input.monthlyPaymentCents ?? 0n;
    if (monthly <= 0n) {
      return { ok: false, message: "Informe o valor da parcela mensal." };
    }
    // Estimamos taxa zero (à vista no preço da compra) por padrão. O usuário pode
    // ajustar depois no detalhe da dívida. Como o usuário informa parcela + n,
    // a taxa "real" é embutida no fato de `valor pago > valor comprado`.
    const annualRate = InterestRate.fromAnnual(0);
    if (!isOk(annualRate)) {
      return { ok: false, message: "Taxa anual inválida." };
    }
    const debtResult = await registerDebt(deps, {
      userId: input.userId,
      label: name,
      notes: null,
      startDate: now,
      expectedEndDate: null,
      kind: "personal_loan",
      originalPrincipal: Money.fromCents(input.valueCents),
      annualInterestRate: annualRate.value,
      termMonths: Math.floor(installments),
      monthlyInstallment: Money.fromCents(monthly),
    });
    if (!isOk(debtResult)) {
      return { ok: false, message: "Falha ao salvar empréstimo." };
    }
    debtId = debtResult.value.id;
  } else if (input.paymentMethod === "financing") {
    const termMonths = input.financingTermMonths ?? 0;
    if (!Number.isFinite(termMonths) || termMonths < 1 || termMonths > 420) {
      return { ok: false, message: "Número de parcelas inválido (1 a 420)." };
    }
    const ratePct = input.financingAnnualRatePct ?? 0;
    if (!Number.isFinite(ratePct) || ratePct < 0 || ratePct > 100) {
      return { ok: false, message: "Taxa anual inválida (0 a 100%)." };
    }
    const downPayment = input.downPaymentCents ?? 0n;
    if (downPayment < 0n) {
      return { ok: false, message: "Entrada não pode ser negativa." };
    }
    if (downPayment >= input.valueCents) {
      return { ok: false, message: "Entrada deve ser menor que o valor da compra." };
    }
    const principalCents = input.valueCents - downPayment;
    const annualRate = InterestRate.fromAnnual(ratePct / 100);
    if (!isOk(annualRate)) {
      return { ok: false, message: "Taxa anual inválida." };
    }
    const debtResult = await registerDebt(deps, {
      userId: input.userId,
      label: name,
      notes: null,
      startDate: now,
      expectedEndDate: null,
      kind: "financing",
      originalPrincipal: Money.fromCents(principalCents),
      annualInterestRate: annualRate.value,
      termMonths: Math.floor(termMonths),
      amortizationMethod: "PRICE",
      monthlyInsurance: null,
      monthlyAdminFee: null,
    });
    if (!isOk(debtResult)) {
      return { ok: false, message: "Falha ao salvar financiamento." };
    }
    debtId = debtResult.value.id;
  }

  // ---- 3) Linkar asset+debt se ambos foram criados/usados ----
  let warning: string | undefined;
  if (assetId && debtId) {
    const linkResult = await linkAssetToDebt(deps, {
      userId: input.userId,
      assetId,
      debtId,
      allocationOriginalCents: input.valueCents,
    });
    if (!isOk(linkResult)) {
      warning = `Não foi possível vincular a compra à dívida: ${linkResult.error.message}`;
    }
  }

  // ---- 4) Reduzir saldo da cash asset, se aplicável ----
  // Fonte do cash asset: id existente escolhido pelo usuário OU o asset que
  // acabou de ser criado via Plan C. Se ambos forem null, não há saldo a
  // reduzir (caso legacy "sem cash asset" ou cashOnboarding === "skip").
  const cashAssetSourceId: string | null =
    input.paymentMethod === "cash" ? (input.fromCashAssetId ?? onboardedCashAssetId) : null;
  if (cashAssetSourceId) {
    const cashAsset: AssetEntity | null = await deps.assets.findById(
      cashAssetSourceId,
      input.userId,
    );
    if (cashAsset && cashAsset.category === "cash") {
      const currentCents = cashAsset.currentValue.toCents();
      const nextCents = currentCents - input.valueCents;
      const clampedCents = nextCents < 0n ? 0n : nextCents;
      const updateResult = await updateAsset(deps, {
        userId: input.userId,
        assetId: cashAsset.id,
        currentValueCents: clampedCents,
      });
      if (!isOk(updateResult)) {
        warning = warning
          ? `${warning}. Saldo da conta não pôde ser atualizado.`
          : "Saldo da conta não pôde ser atualizado.";
      }
    }
  }

  return warning ? { ok: true, assetId, debtId, warning } : { ok: true, assetId, debtId };
}

// ---- Server action wrapper ----

const inputSchema = z
  .object({
    name: z.string().min(1, "Informe o nome da compra.").max(120),
    valueCents: z.string().regex(/^\d+$/, "Valor inválido."),
    category: z.enum(PURCHASE_CATEGORY),
    paymentMethod: z.enum(PAYMENT_METHOD),
    valueBehavior: z.enum(VALUE_BEHAVIOR).optional(),
    annualRatePct: z.number().min(0).max(100).optional(),
    fromCashAssetId: z.string().uuid().nullable().optional(),
    cashOnboarding: z.enum(["create", "skip"]).optional(),
    cashAssetName: z.string().min(1).max(120).optional(),
    currentBalanceCents: z.string().regex(/^\d+$/).optional(),
    installments: z.number().int().min(1).max(360).optional(),
    creditCardDebtId: z.string().uuid().nullable().optional(),
    newCreditCard: z
      .object({
        cardLabel: z.string().min(1).max(120),
        creditLimitCents: z.string().regex(/^\d+$/),
        closingDay: z.number().int().min(1).max(31),
        dueDay: z.number().int().min(1).max(31),
      })
      .nullable()
      .optional(),
    monthlyPaymentCents: z.string().regex(/^\d+$/).optional(),
    downPaymentCents: z.string().regex(/^\d+$/).optional(),
    financingAnnualRatePct: z.number().min(0).max(100).optional(),
    financingTermMonths: z.number().int().min(1).max(420).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.cashOnboarding === "create") {
      if (!v.cashAssetName || v.cashAssetName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe o nome da conta.",
          path: ["cashAssetName"],
        });
      }
      if (v.currentBalanceCents === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe o saldo atual da conta.",
          path: ["currentBalanceCents"],
        });
      }
    }
    if (v.valueBehavior === "depreciating" || v.valueBehavior === "appreciating") {
      if (v.annualRatePct === undefined || v.annualRatePct <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe a taxa anual.",
          path: ["annualRatePct"],
        });
      }
    }
  });

export type CreatePurchaseActionInput = z.input<typeof inputSchema>;

export async function createPurchaseAction(
  raw: CreatePurchaseActionInput,
): Promise<ExecutePurchaseResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const v = parsed.data;

  const user = await requireUser();

  let valueCents: bigint;
  try {
    valueCents = BigInt(v.valueCents);
  } catch {
    return { ok: false, message: "Valor inválido." };
  }

  const monthlyPaymentCents =
    v.monthlyPaymentCents !== undefined ? BigInt(v.monthlyPaymentCents) : undefined;

  const downPaymentCents =
    v.downPaymentCents !== undefined ? BigInt(v.downPaymentCents) : undefined;

  const currentBalanceCents =
    v.currentBalanceCents !== undefined ? BigInt(v.currentBalanceCents) : undefined;

  const newCreditCard = v.newCreditCard
    ? {
        cardLabel: v.newCreditCard.cardLabel,
        creditLimitCents: BigInt(v.newCreditCard.creditLimitCents),
        closingDay: v.newCreditCard.closingDay,
        dueDay: v.newCreditCard.dueDay,
      }
    : null;

  const deps: ExecutePurchaseDeps = {
    assets: new DrizzleAssetRepository(),
    allocations: new DrizzleAssetDebtAllocationRepository(),
    debts: new DrizzleDebtRepository(),
    clock: new SystemClock(),
  };

  const result = await executePurchase(deps, {
    userId: user.id,
    name: v.name,
    valueCents,
    category: v.category,
    paymentMethod: v.paymentMethod,
    ...(v.valueBehavior !== undefined ? { valueBehavior: v.valueBehavior } : {}),
    ...(v.annualRatePct !== undefined ? { annualRatePct: v.annualRatePct } : {}),
    fromCashAssetId: v.fromCashAssetId ?? null,
    ...(v.cashOnboarding !== undefined ? { cashOnboarding: v.cashOnboarding } : {}),
    ...(v.cashAssetName !== undefined ? { cashAssetName: v.cashAssetName } : {}),
    ...(currentBalanceCents !== undefined ? { currentBalanceCents } : {}),
    ...(v.installments !== undefined ? { installments: v.installments } : {}),
    creditCardDebtId: v.creditCardDebtId ?? null,
    newCreditCard,
    ...(monthlyPaymentCents !== undefined ? { monthlyPaymentCents } : {}),
    ...(downPaymentCents !== undefined ? { downPaymentCents } : {}),
    ...(v.financingAnnualRatePct !== undefined
      ? { financingAnnualRatePct: v.financingAnnualRatePct }
      : {}),
    ...(v.financingTermMonths !== undefined
      ? { financingTermMonths: v.financingTermMonths }
      : {}),
  });

  if (result.ok) {
    revalidatePath("/app");
    revalidatePath("/app/patrimonio");
    revalidatePath("/app/dividas");
    if (result.assetId) revalidatePath(`/app/patrimonio/${result.assetId}`);
    if (result.debtId) revalidatePath(`/app/dividas/${result.debtId}`);
  }
  return result;
}
