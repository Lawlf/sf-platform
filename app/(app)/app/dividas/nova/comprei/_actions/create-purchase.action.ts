"use server";

import { z } from "zod";

import { createAsset } from "@/application/use-cases/asset/create-asset.use-case";
import { linkAssetToDebt } from "@/application/use-cases/asset/link-asset-to-debt.use-case";
import { updateAsset } from "@/application/use-cases/asset/update-asset.use-case";
import { registerDebt } from "@/application/use-cases/debt/register-debt.use-case";
import type { AssetEntity, AssetMetadata } from "@/domain/entities/asset.entity";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetDebtAllocationRepositoryPort } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { clock, repos } from "@/infrastructure/container";
import { action, ActionError } from "@/presentation/actions/action";
import { isOk } from "@/shared/errors/result";

import { awardEventAchievement } from "../../../../_actions/_achievements";

// travel e education NÃO viram patrimônio (são gastos consumíveis).
const PURCHASE_CATEGORY = [
  "electronics",
  "furniture",
  "vehicle",
  "travel",
  "education",
  "other",
] as const;
export type PurchaseCategory = (typeof PURCHASE_CATEGORY)[number];

const PAYMENT_METHOD = ["cash", "credit_card", "loan", "financing"] as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[number];

// Mapeado pra `DepreciationKind` da AssetEntity + sinal da taxa (convenção da entity):
//   depreciating → kind=depreciating, rate=+annualRatePct
//   appreciating → kind=appreciating, rate=-annualRatePct
//   stable       → kind=stable, rate=0
const VALUE_BEHAVIOR = ["depreciating", "appreciating", "stable"] as const;
export type ValueBehavior = (typeof VALUE_BEHAVIOR)[number];

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
  // Se omitido, fallback no default da categoria (compat com testes existentes
  // e chamadas sem o step de comportamento de valor).
  valueBehavior?: ValueBehavior;
  annualRatePct?: number;
  fromCashAssetId?: string | null;
  // Plan C: cash asset onboarding inline. "create" cria um cash asset com
  // `cashAssetName` + `currentBalanceCents` antes de aplicar a compra e o usa
  // como fonte para reduzir o saldo. "skip" deixa explícito que o usuário não
  // quer cadastrar agora. Indefinido = legacy behaviour.
  cashOnboarding?: "create" | "skip";
  cashAssetName?: string;
  currentBalanceCents?: bigint;
  installments?: number;
  creditCardDebtId?: string | null;
  newCreditCard?: NewCreditCardInput | null;
  monthlyPaymentCents?: bigint;
  // financing (casa/carro): principal = valueCents - downPaymentCents
  downPaymentCents?: bigint;
  financingAnnualRatePct?: number;
  financingTermMonths?: number;
}

export interface ExecutePurchaseDeps {
  assets: AssetRepositoryPort;
  allocations: AssetDebtAllocationRepositoryPort;
  debts: DebtRepositoryPort;
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

type StepFailure = { ok: false; message: string };

async function onboardCashAsset(
  deps: ExecutePurchaseDeps,
  input: ExecutePurchaseInput,
  now: Date,
): Promise<{ ok: true; assetId: string | null } | StepFailure> {
  if (
    input.paymentMethod !== "cash" ||
    input.cashOnboarding !== "create" ||
    input.fromCashAssetId
  ) {
    return { ok: true, assetId: null };
  }
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
    currency: "BRL",
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
  return { ok: true, assetId: cashCreateResult.value.id };
}

function resolveDepreciation(
  cfg: CategoryConfig,
  input: ExecutePurchaseInput,
): Pick<CategoryConfig, "depreciationKind" | "depreciationRatePctYear"> {
  if (input.valueBehavior === undefined) {
    return {
      depreciationKind: cfg.depreciationKind,
      depreciationRatePctYear: cfg.depreciationRatePctYear,
    };
  }
  const rate = Math.abs(input.annualRatePct ?? 0);
  if (input.valueBehavior === "depreciating") {
    return { depreciationKind: "depreciating", depreciationRatePctYear: rate };
  }
  if (input.valueBehavior === "appreciating") {
    return { depreciationKind: "appreciating", depreciationRatePctYear: -rate };
  }
  return { depreciationKind: "stable", depreciationRatePctYear: 0 };
}

async function createPurchaseAsset(
  deps: ExecutePurchaseDeps,
  input: ExecutePurchaseInput,
  cfg: CategoryConfig,
  name: string,
  now: Date,
): Promise<{ ok: true; assetId: string | null } | StepFailure> {
  if (!cfg.generatesAsset) {
    return { ok: true, assetId: null };
  }
  const metadata: AssetMetadata =
    cfg.assetCategory === "vehicle"
      ? {
          kind: "vehicle",
          brand: "-",
          model: name,
          year: now.getFullYear(),
        }
      : { kind: "other", description: name };

  const { depreciationKind, depreciationRatePctYear } = resolveDepreciation(cfg, input);

  const assetResult = await createAsset(deps, {
    userId: input.userId,
    category: cfg.assetCategory,
    label: name,
    currentValueCents: input.valueCents,
    currency: "BRL",
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
  return { ok: true, assetId: assetResult.value.id };
}

async function applyCreditCardPurchase(
  deps: ExecutePurchaseDeps,
  input: ExecutePurchaseInput,
  now: Date,
): Promise<{ ok: true; debtId: string } | StepFailure> {
  const installments = input.installments ?? 1;
  if (!Number.isFinite(installments) || installments < 1 || installments > 60) {
    return { ok: false, message: "Número de parcelas inválido (1 a 60)." };
  }

  if (input.creditCardDebtId) {
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
    const purchaseValue = Money.fromCents(input.valueCents, card.currentStatement.currency);
    const updated = {
      ...card,
      currentStatement: card.currentStatement.add(purchaseValue),
      currentBalance: card.currentBalance.add(purchaseValue),
      updatedAt: now,
    };
    await deps.debts.update(updated);
    return { ok: true, debtId: card.id };
  }

  if (input.newCreditCard) {
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
    return { ok: true, debtId: debtResult.value.id };
  }

  return {
    ok: false,
    message: "Escolha um cartão existente ou cadastre um novo.",
  };
}

async function createLoanDebt(
  deps: ExecutePurchaseDeps,
  input: ExecutePurchaseInput,
  name: string,
  now: Date,
): Promise<{ ok: true; debtId: string } | StepFailure> {
  const installments = input.installments ?? 1;
  if (!Number.isFinite(installments) || installments < 1 || installments > 360) {
    return { ok: false, message: "Número de parcelas inválido (1 a 360)." };
  }
  const monthly = input.monthlyPaymentCents ?? 0n;
  if (monthly <= 0n) {
    return { ok: false, message: "Informe o valor da parcela mensal." };
  }
  // Estimamos taxa zero por padrão; o usuário pode ajustar depois no detalhe da
  // dívida. Como ele informa parcela + n, a taxa "real" fica embutida no fato
  // de `valor pago > valor comprado`.
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
  return { ok: true, debtId: debtResult.value.id };
}

async function createFinancingDebt(
  deps: ExecutePurchaseDeps,
  input: ExecutePurchaseInput,
  name: string,
  now: Date,
): Promise<{ ok: true; debtId: string } | StepFailure> {
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
  return { ok: true, debtId: debtResult.value.id };
}

async function linkPurchaseToDebt(
  deps: ExecutePurchaseDeps,
  input: ExecutePurchaseInput,
  assetId: string,
  debtId: string,
): Promise<string | undefined> {
  const linkResult = await linkAssetToDebt(deps, {
    userId: input.userId,
    assetId,
    debtId,
    allocationOriginalCents: input.valueCents,
  });
  if (!isOk(linkResult)) {
    return `Não foi possível vincular a compra à dívida: ${linkResult.error.message}`;
  }
  return undefined;
}

async function reduceCashAssetBalance(
  deps: ExecutePurchaseDeps,
  input: ExecutePurchaseInput,
  onboardedCashAssetId: string | null,
): Promise<string | undefined> {
  const cashAssetSourceId: string | null =
    input.paymentMethod === "cash" ? (input.fromCashAssetId ?? onboardedCashAssetId) : null;
  if (!cashAssetSourceId) return undefined;
  const cashAsset: AssetEntity | null = await deps.assets.findById(
    cashAssetSourceId,
    input.userId,
  );
  if (!cashAsset || cashAsset.category !== "cash") return undefined;
  const currentCents = cashAsset.currentValue.toCents();
  const nextCents = currentCents - input.valueCents;
  const clampedCents = nextCents < 0n ? 0n : nextCents;
  const updateResult = await updateAsset(deps, {
    userId: input.userId,
    assetId: cashAsset.id,
    currentValueCents: clampedCents,
  });
  if (!isOk(updateResult)) {
    return "Saldo da conta não pôde ser atualizado.";
  }
  return undefined;
}

// Orquestrador puro (sem `requireUser`, sem `revalidatePath`): é isto que os
// testes exercitam. O server action abaixo só monta deps e delega.
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

  const cashOnboarding = await onboardCashAsset(deps, input, now);
  if (!cashOnboarding.ok) return cashOnboarding;
  const onboardedCashAssetId = cashOnboarding.assetId;

  const assetCreation = await createPurchaseAsset(deps, input, cfg, name, now);
  if (!assetCreation.ok) return assetCreation;
  const assetId = assetCreation.assetId;

  let debtId: string | null = null;
  if (input.paymentMethod === "credit_card") {
    const result = await applyCreditCardPurchase(deps, input, now);
    if (!result.ok) return result;
    debtId = result.debtId;
  } else if (input.paymentMethod === "loan") {
    const result = await createLoanDebt(deps, input, name, now);
    if (!result.ok) return result;
    debtId = result.debtId;
  } else if (input.paymentMethod === "financing") {
    const result = await createFinancingDebt(deps, input, name, now);
    if (!result.ok) return result;
    debtId = result.debtId;
  }

  let warning: string | undefined;
  if (assetId && debtId) {
    warning = await linkPurchaseToDebt(deps, input, assetId, debtId);
  }

  const balanceWarning = await reduceCashAssetBalance(deps, input, onboardedCashAssetId);
  if (balanceWarning) {
    warning = warning ? `${warning}. ${balanceWarning}` : balanceWarning;
  }

  return warning ? { ok: true, assetId, debtId, warning } : { ok: true, assetId, debtId };
}

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

export const createPurchaseAction = action({
  schema: inputSchema,
  revalidates: ["home", "assets", "debts"],
  handler: async (v, { userId }) => {
    const valueCents = BigInt(v.valueCents);

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
      assets: repos.assets,
      allocations: repos.assetDebtAllocations,
      debts: repos.debts,
      clock,
    };

    const result = await executePurchase(deps, {
      userId,
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

    if (!result.ok) throw new ActionError(result.message);

    if (result.debtId) await awardEventAchievement(userId, "primeiro-passo");
    if (result.assetId) await awardEventAchievement(userId, "mapa-do-tesouro");

    return {
      assetId: result.assetId,
      debtId: result.debtId,
      warning: result.warning,
    };
  },
  revalidatePaths: (data) => [
    ...(data.assetId ? [`/app/patrimonio/${data.assetId}`] : []),
    ...(data.debtId ? [`/app/dividas/${data.debtId}`] : []),
  ],
});
