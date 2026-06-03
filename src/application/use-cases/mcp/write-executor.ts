import type { AssetCategory, AssetMetadata } from "@/domain/entities/asset.entity";
import type {
  ExpenseCategory,
  InstallmentPurchase,
  RecurringFrequency,
} from "@/domain/entities/debt.entity";
import type { GoalEntity, GoalFundingMode, GoalType } from "@/domain/entities/goal.entity";
import type { IncomeFrequency } from "@/domain/entities/income.entity";
import { findWriteAction } from "@/domain/mcp/write-actions";
import type { Clock } from "@/domain/ports/clock.port";
import type { AssetDebtAllocationRepository } from "@/domain/ports/repositories/asset-debt-allocation.repository";
import type { AssetRepository } from "@/domain/ports/repositories/asset.repository";
import type { DebtPaymentRepository } from "@/domain/ports/repositories/debt-payment.repository";
import type { DebtRepository } from "@/domain/ports/repositories/debt.repository";
import type { GoalRepository } from "@/domain/ports/repositories/goal.repository";
import type { IncomeRepository } from "@/domain/ports/repositories/income.repository";
import { InterestRate } from "@/domain/value-objects/interest-rate.vo";
import { Money } from "@/domain/value-objects/money.vo";
import { serialize } from "@/presentation/http/mcp/serialize";
import { isErr } from "@/shared/errors/result";

import { createAsset } from "../asset/create-asset.use-case";
import { deleteAsset } from "../asset/delete-asset.use-case";
import { updateAsset } from "../asset/update-asset.use-case";
import { deleteDebt } from "../debt/delete-debt.use-case";
import { registerDebt, type RegisterDebtInput } from "../debt/register-debt.use-case";
import { updateDebt } from "../debt/update-debt.use-case";
import { createGoal } from "../goal/create-goal.use-case";
import { deleteGoal } from "../goal/delete-goal.use-case";
import { updateGoal } from "../goal/update-goal.use-case";
import { deleteIncome } from "../income/delete-income.use-case";
import { registerIncome } from "../income/register-income.use-case";
import { updateIncome } from "../income/update-income.use-case";

export interface WriteExecutorResult {
  entityType: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reversible: boolean;
}

export interface WriteExecutorDeps {
  incomes: IncomeRepository;
  debts: DebtRepository;
  payments: DebtPaymentRepository;
  allocations: AssetDebtAllocationRepository;
  assets: AssetRepository;
  goals: GoalRepository;
  clock: Clock;
}

export interface WriteExecutorInput {
  toolName: string;
  userId: string;
  isPro: boolean;
  args: Record<string, unknown>;
}

export async function executeWrite(
  deps: WriteExecutorDeps,
  input: WriteExecutorInput,
): Promise<WriteExecutorResult> {
  const action = findWriteAction(input.toolName);
  if (!action) {
    throw new Error(`Ferramenta de escrita desconhecida: ${input.toolName}`);
  }
  const { args, userId } = input;

  switch (input.toolName) {
    case "income_create": {
      const result = await registerIncome(
        { incomes: deps.incomes, clock: deps.clock },
        {
          userId,
          label: str(args.label),
          amount: money(args.amountCents),
          frequency: str(args.frequency) as IncomeFrequency,
          startDate: date(args.startDate),
          endDate: optDate(args.endDate),
        },
      );
      if (isErr(result)) throw result.error;
      const after = serialize(result.value);
      return { entityType: "income", entityId: result.value.id, before: null, after, reversible: true };
    }

    case "income_update": {
      const id = str(args.incomeId);
      const existing = await deps.incomes.findById(id);
      const before = existing ? serialize(existing) : null;
      const result = await updateIncome(
        { incomes: deps.incomes, clock: deps.clock },
        {
          userId,
          incomeId: id,
          ...(args.label !== undefined && { label: str(args.label) }),
          ...(args.amountCents !== undefined && { amount: money(args.amountCents) }),
          ...(args.frequency !== undefined && { frequency: str(args.frequency) as IncomeFrequency }),
          ...(args.startDate !== undefined && { startDate: date(args.startDate) }),
          ...(args.endDate !== undefined && { endDate: optDate(args.endDate) }),
        },
      );
      if (isErr(result)) throw result.error;
      const after = serialize(result.value);
      return { entityType: "income", entityId: result.value.id, before, after, reversible: true };
    }

    case "income_delete": {
      const id = str(args.incomeId);
      const existing = await deps.incomes.findById(id);
      const before = existing ? serialize(existing) : null;
      const result = await deleteIncome(
        { incomes: deps.incomes, clock: deps.clock },
        { userId, incomeId: id },
      );
      if (isErr(result)) throw result.error;
      return { entityType: "income", entityId: id, before, after: null, reversible: true };
    }

    case "debt_create": {
      const result = await registerDebt(
        { debts: deps.debts, clock: deps.clock },
        buildRegisterDebtInput(userId, args),
      );
      if (isErr(result)) throw result.error;
      const after = serialize(result.value);
      return { entityType: "debt", entityId: result.value.id, before: null, after, reversible: true };
    }

    case "debt_update": {
      const id = str(args.debtId);
      const existing = await deps.debts.findById(id);
      const before = existing ? serialize(existing) : null;
      const result = await updateDebt(
        { debts: deps.debts, clock: deps.clock },
        {
          userId,
          debtId: id,
          ...(args.label !== undefined && { label: str(args.label) }),
          ...(args.notes !== undefined && { notes: optStr(args.notes) }),
          ...(args.expectedEndDate !== undefined && { expectedEndDate: optDate(args.expectedEndDate) }),
          ...(args.currentBalanceCents !== undefined && { currentBalance: money(args.currentBalanceCents) }),
          ...(args.annualInterestRate !== undefined && {
            annualInterestRate: annualRate(args.annualInterestRate),
          }),
          ...(args.monthlyInstallmentCents !== undefined && {
            monthlyInstallment: money(args.monthlyInstallmentCents),
          }),
          ...(args.creditLimitCents !== undefined && { creditLimit: money(args.creditLimitCents) }),
          ...(args.currentStatementCents !== undefined && {
            currentStatement: money(args.currentStatementCents),
          }),
          ...(args.statementDay !== undefined && { statementDay: num(args.statementDay) }),
          ...(args.dueDay !== undefined && { dueDay: num(args.dueDay) }),
          ...(args.bankName !== undefined && { bankName: str(args.bankName) }),
          ...(args.recurringAmountCents !== undefined && {
            recurringAmountCents: cents(args.recurringAmountCents),
          }),
          ...(args.recurringFrequency !== undefined && {
            recurringFrequency: str(args.recurringFrequency) as RecurringFrequency,
          }),
        },
      );
      if (isErr(result)) throw result.error;
      const after = serialize(result.value);
      return { entityType: "debt", entityId: result.value.id, before, after, reversible: false };
    }

    case "debt_delete": {
      const id = str(args.debtId);
      const existing = await deps.debts.findById(id);
      const before = existing ? serialize(existing) : null;
      const result = await deleteDebt(
        {
          debts: deps.debts,
          payments: deps.payments,
          allocations: deps.allocations,
          clock: deps.clock,
        },
        { userId, debtId: id },
      );
      if (isErr(result)) throw result.error;
      return { entityType: "debt", entityId: id, before, after: null, reversible: false };
    }

    case "asset_create": {
      const result = await createAsset(
        {
          assets: deps.assets,
          allocations: deps.allocations,
          debts: deps.debts,
          clock: deps.clock,
        },
        {
          userId,
          category: str(args.category) as AssetCategory,
          label: str(args.label),
          currentValueCents: cents(args.currentValueCents),
          metadata: (args.metadata as AssetMetadata | null | undefined) ?? null,
          fipeCode: optStr(args.fipeCode),
          acquiredAt: optDate(args.acquiredAt),
          allocations: [],
          ...(args.purchasePriceCents !== undefined && {
            purchasePriceCents: cents(args.purchasePriceCents),
          }),
        },
      );
      if (isErr(result)) throw result.error;
      const after = serialize(result.value);
      return { entityType: "asset", entityId: result.value.id, before: null, after, reversible: true };
    }

    case "asset_update": {
      const id = str(args.assetId);
      const existing = await deps.assets.findById(id, userId);
      const before = existing ? serialize(existing) : null;
      const result = await updateAsset(
        { assets: deps.assets, clock: deps.clock },
        {
          userId,
          assetId: id,
          ...(args.label !== undefined && { label: str(args.label) }),
          ...(args.currentValueCents !== undefined && { currentValueCents: cents(args.currentValueCents) }),
          ...(args.metadata !== undefined && { metadata: args.metadata as AssetMetadata | null }),
          ...(args.fipeCode !== undefined && { fipeCode: optStr(args.fipeCode) }),
          ...(args.acquiredAt !== undefined && { acquiredAt: optDate(args.acquiredAt) }),
        },
      );
      if (isErr(result)) throw result.error;
      const after = serialize(result.value);
      return { entityType: "asset", entityId: result.value.id, before, after, reversible: true };
    }

    case "asset_delete": {
      const id = str(args.assetId);
      const existing = await deps.assets.findById(id, userId);
      const before = existing ? serialize(existing) : null;
      const result = await deleteAsset(
        { assets: deps.assets, allocations: deps.allocations, clock: deps.clock },
        { userId, assetId: id },
      );
      if (isErr(result)) throw result.error;
      return { entityType: "asset", entityId: id, before, after: null, reversible: false };
    }

    case "goal_create": {
      const result = await createGoal(
        { goals: deps.goals },
        {
          userId,
          isPro: input.isPro,
          input: {
            type: str(args.type) as GoalType,
            title: str(args.title),
            ...(args.targetCents !== undefined && { targetCents: optCents(args.targetCents) }),
            ...(args.deadline !== undefined && { deadline: optDate(args.deadline) }),
            ...(args.linkedDebtId !== undefined && { linkedDebtId: optStr(args.linkedDebtId) }),
            ...(args.linkedAssetId !== undefined && { linkedAssetId: optStr(args.linkedAssetId) }),
            ...(args.targetMonths !== undefined && { targetMonths: optNum(args.targetMonths) }),
            ...(args.fundingMode !== undefined && {
              fundingMode: optStr(args.fundingMode) as GoalFundingMode | null,
            }),
            ...(args.manualSavedCents !== undefined && { manualSavedCents: optCents(args.manualSavedCents) }),
            ...(args.monthlyCostCents !== undefined && { monthlyCostCents: optCents(args.monthlyCostCents) }),
            ...(args.realReturnPct !== undefined && { realReturnPct: optNum(args.realReturnPct) }),
          },
        },
      );
      if (!result.ok) throw new Error(result.message);
      const after = serialize(result.goal);
      return { entityType: "goal", entityId: result.goal.id, before: null, after, reversible: true };
    }

    case "goal_update": {
      const id = str(args.goalId);
      const existing = await deps.goals.findById(id);
      const before = existing ? serialize(existing) : null;
      const result = await updateGoal(
        { goals: deps.goals },
        { userId, goalId: id, patch: buildGoalPatch(args) },
      );
      if (!result.ok) throw new Error(result.message);
      const after = serialize(result.goal);
      return { entityType: "goal", entityId: result.goal.id, before, after, reversible: true };
    }

    case "goal_delete": {
      const id = str(args.goalId);
      const existing = await deps.goals.findById(id);
      const before = existing ? serialize(existing) : null;
      const result = await deleteGoal({ goals: deps.goals }, { userId, goalId: id });
      if (!result.ok) throw new Error(result.message);
      return { entityType: "goal", entityId: id, before, after: null, reversible: true };
    }

    default:
      throw new Error(`Ferramenta de escrita não implementada: ${input.toolName}`);
  }
}

function buildRegisterDebtInput(userId: string, args: Record<string, unknown>): RegisterDebtInput {
  const kind = str(args.kind);
  switch (kind) {
    case "financing":
      return {
        kind: "financing",
        userId,
        label: str(args.label),
        notes: optStr(args.notes),
        startDate: date(args.startDate),
        expectedEndDate: optDate(args.expectedEndDate),
        originalPrincipal: money(args.originalPrincipalCents),
        annualInterestRate: annualRate(args.annualInterestRate),
        termMonths: num(args.termMonths),
        amortizationMethod: str(args.amortizationMethod) as "PRICE" | "SAC",
        monthlyInsurance: optMoney(args.monthlyInsuranceCents),
        monthlyAdminFee: optMoney(args.monthlyAdminFeeCents),
        ...(args.currentBalanceCents !== undefined && {
          currentBalance: optMoney(args.currentBalanceCents),
        }),
      };
    case "personal_loan":
      return {
        kind: "personal_loan",
        userId,
        label: str(args.label),
        notes: optStr(args.notes),
        startDate: date(args.startDate),
        expectedEndDate: optDate(args.expectedEndDate),
        originalPrincipal: money(args.originalPrincipalCents),
        annualInterestRate: annualRate(args.annualInterestRate),
        termMonths: num(args.termMonths),
        monthlyInstallment: money(args.monthlyInstallmentCents),
        ...(args.currentBalanceCents !== undefined && {
          currentBalance: optMoney(args.currentBalanceCents),
        }),
      };
    case "credit_card":
      return {
        kind: "credit_card",
        userId,
        label: str(args.label),
        notes: optStr(args.notes),
        startDate: date(args.startDate),
        expectedEndDate: optDate(args.expectedEndDate),
        creditLimit: money(args.creditLimitCents),
        currentStatement: money(args.currentStatementCents),
        statementDay: num(args.statementDay),
        dueDay: num(args.dueDay),
        revolvingBalance: optMoney(args.revolvingBalanceCents),
        revolvingMonthlyRate:
          args.revolvingMonthlyRate === undefined || args.revolvingMonthlyRate === null
            ? null
            : monthlyRate(args.revolvingMonthlyRate),
        installmentPurchases: (args.installmentPurchases as InstallmentPurchase[] | undefined) ?? [],
      };
    case "overdraft":
      return {
        kind: "overdraft",
        userId,
        label: str(args.label),
        notes: optStr(args.notes),
        startDate: date(args.startDate),
        expectedEndDate: optDate(args.expectedEndDate),
        currentBalance: money(args.currentBalanceCents),
        bankName: str(args.bankName),
        monthlyRate: monthlyRate(args.monthlyRate),
      };
    case "recurring":
      return {
        kind: "recurring",
        userId,
        label: str(args.label),
        recurringFrequency: str(args.recurringFrequency) as RecurringFrequency,
        recurringAmountCents: cents(args.recurringAmountCents),
        expenseCategory: str(args.expenseCategory) as ExpenseCategory,
        startDate: date(args.startDate),
        ...(args.endDate !== undefined && { endDate: optDate(args.endDate) }),
        ...(args.notes !== undefined && { notes: optStr(args.notes) ?? undefined }),
        ...(args.dueDay !== undefined && { dueDay: optNum(args.dueDay) }),
      };
    default:
      throw new Error(`Tipo de dívida não suportado: ${kind}`);
  }
}

function buildGoalPatch(args: Record<string, unknown>): Partial<GoalEntity> {
  const patch: Partial<GoalEntity> = {};
  if (args.title !== undefined) patch.title = str(args.title);
  if (args.status !== undefined) patch.status = str(args.status) as GoalEntity["status"];
  if (args.targetCents !== undefined) patch.targetCents = optCents(args.targetCents);
  if (args.deadline !== undefined) patch.deadline = optDate(args.deadline);
  if (args.linkedDebtId !== undefined) patch.linkedDebtId = optStr(args.linkedDebtId);
  if (args.linkedAssetId !== undefined) patch.linkedAssetId = optStr(args.linkedAssetId);
  if (args.targetMonths !== undefined) patch.targetMonths = optNum(args.targetMonths);
  if (args.fundingMode !== undefined) {
    patch.fundingMode = optStr(args.fundingMode) as GoalFundingMode | null;
  }
  if (args.manualSavedCents !== undefined) patch.manualSavedCents = optCents(args.manualSavedCents);
  if (args.monthlyCostCents !== undefined) patch.monthlyCostCents = optCents(args.monthlyCostCents);
  if (args.realReturnPct !== undefined) patch.realReturnPct = optNum(args.realReturnPct);
  return patch;
}

function str(value: unknown): string {
  if (typeof value !== "string") throw new Error("Esperado valor de texto.");
  return value;
}

function optStr(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return str(value);
}

function num(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Esperado valor numérico.");
  }
  return value;
}

function optNum(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  return num(value);
}

function date(value: unknown): Date {
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) throw new Error("Data inválida.");
  return d;
}

function optDate(value: unknown): Date | null {
  if (value === undefined || value === null) return null;
  return date(value);
}

function cents(value: unknown): bigint {
  return BigInt(Math.round(num(value)));
}

function optCents(value: unknown): bigint | null {
  if (value === undefined || value === null) return null;
  return cents(value);
}

function money(value: unknown): Money {
  return Money.fromCents(cents(value));
}

function optMoney(value: unknown): Money | null {
  if (value === undefined || value === null) return null;
  return money(value);
}

function annualRate(value: unknown): InterestRate {
  const r = InterestRate.fromAnnual(num(value));
  if (isErr(r)) throw r.error;
  return r.value;
}

function monthlyRate(value: unknown): InterestRate {
  const r = InterestRate.fromMonthly(num(value));
  if (isErr(r)) throw r.error;
  return r.value;
}
