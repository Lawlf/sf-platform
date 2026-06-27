import type { AssetEntity } from "@/domain/entities/asset.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import type { GoalEntity } from "@/domain/entities/goal.entity";
import type { IncomeEntity } from "@/domain/entities/income.entity";
import { McpPendingNotFound } from "@/domain/errors/mcp-errors";
import { findWriteAction } from "@/domain/mcp/write-actions";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetRepositoryPort } from "@/domain/ports/repositories/asset.repository";
import type { DebtRepositoryPort } from "@/domain/ports/repositories/debt.repository";
import type { GoalRepositoryPort } from "@/domain/ports/repositories/goal.repository";
import type { IncomeRepositoryPort } from "@/domain/ports/repositories/income.repository";
import type { McpAuditLogRepositoryPort } from "@/domain/ports/repositories/mcp-audit-log.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { CURRENCIES, type Currency, Money } from "@/domain/value-objects/money.vo";
import { DomainError } from "@/shared/errors/domain-error";
import { err, ok, type Result } from "@/shared/errors/result";

export class McpUndoNotReversible extends DomainError {
  readonly code = "MCP_UNDO_NOT_REVERSIBLE" as const;
  constructor(message = "Esta ação não pode ser desfeita.") {
    super(message);
  }
}

export interface UndoMcpActionDeps {
  audit: McpAuditLogRepositoryPort;
  incomes: IncomeRepositoryPort;
  debts: DebtRepositoryPort;
  assets: AssetRepositoryPort;
  goals: GoalRepositoryPort;
  clock: Clock;
}

export interface UndoMcpActionInput {
  userId: string;
  auditId: string;
}

export async function undoMcpAction(
  deps: UndoMcpActionDeps,
  input: UndoMcpActionInput,
): Promise<Result<void, McpPendingNotFound | McpUndoNotReversible>> {
  const entry = await deps.audit.findById(input.auditId);
  if (!entry || entry.userId !== input.userId) {
    return err(new McpPendingNotFound());
  }
  if (!entry.reversible || entry.undoneAt !== null) {
    return err(new McpUndoNotReversible());
  }

  const action = findWriteAction(entry.toolName);
  if (!action) return err(new McpUndoNotReversible());

  const now = deps.clock.now();

  try {
    await reverse(deps, entry.entityType, action.verb, entry.entityId, entry.beforeState, now);
  } catch {
    return err(new McpUndoNotReversible());
  }

  await deps.audit.markUndone(input.auditId, deps.clock.now());
  return ok(undefined);
}

async function reverse(
  deps: UndoMcpActionDeps,
  entityType: string,
  verb: string,
  entityId: string | null,
  before: Record<string, unknown> | null,
  now: Date,
): Promise<void> {
  if (verb === "create") {
    if (!entityId) throw new McpUndoNotReversible();
    await softDelete(deps, entityType, entityId, now);
    return;
  }

  if (verb === "delete") {
    if (!entityId) throw new McpUndoNotReversible();
    if (entityType === "income") {
      await deps.incomes.restore(entityId);
      return;
    }
    if (entityType === "goal") {
      await deps.goals.restore(entityId);
      return;
    }
    throw new McpUndoNotReversible();
  }

  if (verb === "update") {
    if (!before) throw new McpUndoNotReversible();
    await restoreUpdate(deps, entityType, before);
    return;
  }

  throw new McpUndoNotReversible();
}

async function softDelete(
  deps: UndoMcpActionDeps,
  entityType: string,
  entityId: string,
  now: Date,
): Promise<void> {
  switch (entityType) {
    case "income":
      await deps.incomes.softDelete(entityId, now);
      return;
    case "goal":
      await deps.goals.softDelete(entityId);
      return;
    case "debt":
      await deps.debts.softDelete(entityId, now);
      return;
    case "asset":
      await deps.assets.softDelete(entityId, now);
      return;
    default:
      throw new McpUndoNotReversible();
  }
}

async function restoreUpdate(
  deps: UndoMcpActionDeps,
  entityType: string,
  before: Record<string, unknown>,
): Promise<void> {
  switch (entityType) {
    case "income":
      await deps.incomes.update(deserializeIncome(before));
      return;
    case "goal":
      await deps.goals.update(str(before.id), deserializeGoalPatch(before));
      return;
    case "debt":
      await deps.debts.update(deserializeDebt(before));
      return;
    case "asset":
      await deps.assets.update(deserializeAsset(before));
      return;
    default:
      throw new McpUndoNotReversible();
  }
}

function deserializeIncome(s: Record<string, unknown>): IncomeEntity {
  return {
    id: str(s.id),
    userId: str(s.userId),
    profileId: typeof s.profileId === "string" ? s.profileId : str(s.userId),
    label: str(s.label),
    amount: money(s.amount),
    frequency: str(s.frequency) as IncomeEntity["frequency"],
    startDate: date(s.startDate),
    endDate: optDate(s.endDate),
    paymentDay: optNum(s.paymentDay),
    isEstimated: typeof s.isEstimated === "boolean" ? s.isEstimated : false,
    sourceBreakdown: null,
    isActive: bool(s.isActive),
    createdAt: date(s.createdAt),
    deletedAt: optDate(s.deletedAt),
  };
}

function deserializeGoalPatch(s: Record<string, unknown>): Partial<GoalEntity> {
  return {
    type: str(s.type) as GoalEntity["type"],
    title: str(s.title),
    status: str(s.status) as GoalEntity["status"],
    targetCents: optBigint(s.targetCents),
    deadline: optDate(s.deadline),
    linkedDebtId: optStr(s.linkedDebtId),
    linkedAssetId: optStr(s.linkedAssetId),
    targetMonths: optNum(s.targetMonths),
    fundingMode: (s.fundingMode ?? null) as GoalEntity["fundingMode"],
    manualSavedCents: optBigint(s.manualSavedCents),
    monthlyCostCents: optBigint(s.monthlyCostCents),
    realReturnPct: optNum(s.realReturnPct),
  };
}

function deserializeDebt(s: Record<string, unknown>): DebtEntity {
  const base = {
    id: str(s.id),
    userId: str(s.userId),
    profileId: typeof s.profileId === "string" ? s.profileId : str(s.userId),
    label: str(s.label),
    status: str(s.status) as DebtEntity["status"],
    originalPrincipal: money(s.originalPrincipal),
    currentBalance: money(s.currentBalance),
    startDate: date(s.startDate),
    expectedEndDate: optDate(s.expectedEndDate),
    notes: optStr(s.notes),
    createdAt: date(s.createdAt),
    updatedAt: date(s.updatedAt),
    deletedAt: optDate(s.deletedAt),
    recurringFrequency: (s.recurringFrequency ?? null) as DebtEntity["recurringFrequency"],
    recurringAmountCents: optBigint(s.recurringAmountCents),
    expenseCategory: (s.expenseCategory ?? null) as DebtEntity["expenseCategory"],
  };
  const kind = str(s.kind);
  switch (kind) {
    case "financing":
      return {
        ...base,
        kind: "financing",
        amortizationMethod: str(s.amortizationMethod) as "PRICE" | "SAC",
        annualInterestRate: annualRate(s.annualInterestRate),
        termMonths: num(s.termMonths),
        monthlyInsurance: optMoney(s.monthlyInsurance),
        monthlyAdminFee: optMoney(s.monthlyAdminFee),
      };
    case "personal_loan":
      return {
        ...base,
        kind: "personal_loan",
        annualInterestRate: annualRate(s.annualInterestRate),
        termMonths: num(s.termMonths),
        monthlyInstallment: money(s.monthlyInstallment),
        dueDay: optNum(s.dueDay),
      };
    case "credit_card":
      return {
        ...base,
        kind: "credit_card",
        creditLimit: money(s.creditLimit),
        statementDay: num(s.statementDay),
        dueDay: num(s.dueDay),
        currentStatement: money(s.currentStatement),
        revolvingBalance: optMoney(s.revolvingBalance),
        revolvingMonthlyRate: optMonthlyRate(s.revolvingMonthlyRate),
        installmentPurchases: deserializeInstallments(s.installmentPurchases),
      };
    case "overdraft":
      return {
        ...base,
        kind: "overdraft",
        bankName: str(s.bankName),
        monthlyRate: monthlyRate(s.monthlyRate),
        lastChargeDate: optDate(s.lastChargeDate),
      };
    case "recurring":
      return {
        ...base,
        kind: "recurring",
        recurringFrequency: str(s.recurringFrequency) as DebtEntity["recurringFrequency"] &
          NonNullable<DebtEntity["recurringFrequency"]>,
        recurringAmountCents: bigintOf(s.recurringAmountCents),
        expenseCategory: str(s.expenseCategory) as NonNullable<DebtEntity["expenseCategory"]>,
        dueDay: optNum(s.dueDay),
      };
    default:
      throw new McpUndoNotReversible();
  }
}

function deserializeInstallments(
  value: unknown,
): DebtEntity extends { installmentPurchases: infer P } ? P : never {
  if (!Array.isArray(value)) return [] as never;
  return value.map((raw) => {
    const item = raw as Record<string, unknown>;
    return {
      description: str(item.description),
      total: money(item.total),
      installmentsTotal: num(item.installmentsTotal),
      installmentsRemaining: num(item.installmentsRemaining),
      monthlyValue: money(item.monthlyValue),
    };
  }) as never;
}

function deserializeAsset(s: Record<string, unknown>): AssetEntity {
  return {
    id: str(s.id),
    userId: str(s.userId),
    profileId: optStr(s.profileId) ?? str(s.userId),
    category: str(s.category) as AssetEntity["category"],
    label: str(s.label),
    currentValue: money(s.currentValue),
    metadata: deserializeAssetMetadata(s.metadata),
    fipeCode: optStr(s.fipeCode),
    fipeLastSyncedAt: optDate(s.fipeLastSyncedAt),
    acquiredAt: optDate(s.acquiredAt),
    depreciationKind: str(s.depreciationKind) as AssetEntity["depreciationKind"],
    depreciationRatePctYear: num(s.depreciationRatePctYear),
    purchaseDate: optDate(s.purchaseDate),
    purchasePriceCents: optBigint(s.purchasePriceCents),
    monthlyCostEstimateCents: null,
    createdAt: date(s.createdAt),
    updatedAt: date(s.updatedAt),
    anchorAt: optDate(s.anchorAt),
    deactivatedAt: optDate(s.deactivatedAt),
    deactivationKind: (s.deactivationKind ?? null) as AssetEntity["deactivationKind"],
    salePriceCents: optBigint(s.salePriceCents),
    deactivationReason: optStr(s.deactivationReason),
    deletedAt: optDate(s.deletedAt),
    externalAccountKey: optStr(s.externalAccountKey),
  };
}

function deserializeAssetMetadata(value: unknown): AssetEntity["metadata"] {
  if (value === null || value === undefined) return null;
  const meta = value as Record<string, unknown>;
  const out: Record<string, unknown> = { ...meta };
  for (const key of ["avgPriceCents", "lastQuoteCents"]) {
    if (typeof out[key] === "string") out[key] = BigInt(out[key] as string);
  }
  for (const key of ["lastQuoteAt", "lastReviewedAt"]) {
    if (typeof out[key] === "string") out[key] = new Date(out[key] as string);
  }
  return out as AssetEntity["metadata"];
}

function str(value: unknown): string {
  if (typeof value !== "string") throw new McpUndoNotReversible();
  return value;
}

function optStr(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return str(value);
}

function bool(value: unknown): boolean {
  if (typeof value !== "boolean") throw new McpUndoNotReversible();
  return value;
}

function num(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new McpUndoNotReversible();
  return value;
}

function optNum(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  return num(value);
}

function date(value: unknown): Date {
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) throw new McpUndoNotReversible();
  return d;
}

function optDate(value: unknown): Date | null {
  if (value === undefined || value === null) return null;
  return date(value);
}

function bigintOf(value: unknown): bigint {
  if (typeof value === "string") return BigInt(value);
  if (typeof value === "number") return BigInt(Math.round(value));
  throw new McpUndoNotReversible();
}

function optBigint(value: unknown): bigint | null {
  if (value === undefined || value === null) return null;
  return bigintOf(value);
}

function money(value: unknown): Money {
  if (value === null || typeof value !== "object") throw new McpUndoNotReversible();
  const record = value as Record<string, unknown>;
  const currency = (CURRENCIES as readonly string[]).includes(record.currency as string)
    ? (record.currency as Currency)
    : "BRL";
  return Money.fromCents(bigintOf(record.cents), currency);
}

function optMoney(value: unknown): Money | null {
  if (value === undefined || value === null) return null;
  return money(value);
}

function annualRate(value: unknown): InterestRate {
  if (value === null || typeof value !== "object") throw new McpUndoNotReversible();
  const annualPct = num((value as Record<string, unknown>).annualPct);
  const r = InterestRate.fromAnnual(annualPct / 100);
  if (r._tag === "err") throw new McpUndoNotReversible();
  return r.value;
}

function monthlyRate(value: unknown): InterestRate {
  if (value === null || typeof value !== "object") throw new McpUndoNotReversible();
  const monthlyPct = num((value as Record<string, unknown>).monthlyPct);
  const r = InterestRate.fromMonthly(monthlyPct / 100);
  if (r._tag === "err") throw new McpUndoNotReversible();
  return r.value;
}

function optMonthlyRate(value: unknown): InterestRate | null {
  if (value === undefined || value === null) return null;
  return monthlyRate(value);
}
