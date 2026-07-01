"use server";

import crypto from "node:crypto";

import { z } from "zod";

import {
  resolveMonthlyTimeline,
  type ResolvedMonthlyAmount,
} from "@/application/use-cases/debt/resolve-monthly-amount.use-case";
import type {
  DebtAmountAdjustmentEntity,
  OverrideAdjustment,
  PeriodAdjustment,
} from "@/domain/entities/debt-amount-adjustment.entity";
import {
  isValidMonthKey,
  compareMonthKey,
} from "@/domain/entities/debt-amount-adjustment.entity";
import type { DebtEntity } from "@/domain/entities/debt.entity";
import { dueDateForMonth } from "@/domain/services/debt-calendar.service";
import { Money } from "@/domain/value-objects/money.vo";
import { clock, repos } from "@/infrastructure/container";
import { action, ActionError } from "@/presentation/actions/action";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

// Janela default exibida na timeline: 24 meses retroativos a partir do mês
// atual, esticando até 2 meses no futuro pra usuário ver projeção.
const DEFAULT_PAST_MONTHS = 24;
const DEFAULT_FUTURE_MONTHS = 2;

export interface SerializedAdjustment {
  id: string;
  kind: "period" | "override";
  startMonth: string | null;
  endMonth: string | null;
  month: string | null;
  amountCents: string;
  note: string | null;
}

export interface SerializedMonthlyAmount {
  monthKey: string;
  amountCents: string;
  source: "override" | "period" | "base";
  adjustmentId: string | null;
  note: string | null;
  // ISO 8601 date (UTC) do vencimento esperado nesse mês. `null` quando a
  // dívida não tem dia de pagamento conhecido (ex: overdraft sem startDate
  // útil). Cliente formata pra `dd/MM`.
  dueDateIso: string | null;
}

function serializeAdjustment(a: DebtAmountAdjustmentEntity): SerializedAdjustment {
  if (a.kind === "period") {
    return {
      id: a.id,
      kind: "period",
      startMonth: a.startMonth,
      endMonth: a.endMonth,
      month: null,
      amountCents: a.amount.toCents().toString(),
      note: a.note,
    };
  }
  return {
    id: a.id,
    kind: "override",
    startMonth: null,
    endMonth: null,
    month: a.month,
    amountCents: a.amount.toCents().toString(),
    note: a.note,
  };
}

function serializeResolved(r: ResolvedMonthlyAmount, debt: DebtEntity): SerializedMonthlyAmount {
  const due = dueDateForMonth(debt, r.monthKey);
  return {
    monthKey: r.monthKey,
    amountCents: r.amount.toCents().toString(),
    source: r.source,
    adjustmentId: r.adjustmentId,
    note: r.note,
    dueDateIso: due ? due.toISOString() : null,
  };
}

export interface HistoricoPayload {
  adjustments: SerializedAdjustment[];
  timeline: SerializedMonthlyAmount[];
}

export async function loadHistorico(debtId: string): Promise<HistoricoPayload> {
  const user = await requireUser();
  const debts = repos.debts;
  const debt = await debts.findById(debtId);
  if (!debt || debt.userId !== user.id) {
    throw new Error("Dívida não encontrada.");
  }

  const adjustmentsRepo = repos.debtAmountAdjustments;
  const adjustments = await adjustmentsRepo.listForDebt(debtId, user.id);

  const now = clock.now();
  const defaultTo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + DEFAULT_FUTURE_MONTHS, 1),
  );
  const defaultFrom = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - DEFAULT_PAST_MONTHS, 1),
  );
  const startMonth = new Date(
    Date.UTC(debt.startDate.getUTCFullYear(), debt.startDate.getUTCMonth(), 1),
  );
  // Nunca mostra meses antes do início real da dívida (histórico "fantasma").
  const from = startMonth > defaultFrom ? startMonth : defaultFrom;
  // Se a dívida tem fim previsto, a janela futura não passa disso.
  const to = debt.expectedEndDate && debt.expectedEndDate < defaultTo ? debt.expectedEndDate : defaultTo;
  const timeline = resolveMonthlyTimeline(debt, { from, to }, adjustments);

  return {
    adjustments: adjustments.map(serializeAdjustment),
    timeline: timeline.map((r) => serializeResolved(r, debt)),
  };
}

const monthKeySchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mês inválido. Use o formato YYYY-MM.");

const addPeriodSchema = z.object({
  debtId: z.string().uuid(),
  startMonth: monthKeySchema,
  endMonth: monthKeySchema.nullable(),
  amountCents: z.string().regex(/^\d+$/),
  note: z.string().max(280).nullable().optional(),
});

const addOverrideSchema = z.object({
  debtId: z.string().uuid(),
  month: monthKeySchema,
  amountCents: z.string().regex(/^\d+$/),
  note: z.string().max(280).nullable().optional(),
});

export type AddPeriodInput = z.input<typeof addPeriodSchema>;
export type AddOverrideInput = z.input<typeof addOverrideSchema>;

async function requireOwnedDebt(debtId: string, userId: string): Promise<DebtEntity> {
  const debt = await repos.debts.findById(debtId);
  if (!debt || debt.userId !== userId) {
    throw new ActionError("Dívida não encontrada.");
  }
  return debt;
}

export const addPeriodAction = action({
  schema: addPeriodSchema,
  handler: async (v, { userId, profileId }) => {
    if (v.endMonth !== null && compareMonthKey(v.endMonth, v.startMonth) < 0) {
      throw new ActionError("Mês final deve ser igual ou depois do inicial.");
    }
    await requireOwnedDebt(v.debtId, userId);

    const amountCents = BigInt(v.amountCents);
    if (amountCents < 0n) throw new ActionError("Valor não pode ser negativo.");

    const now = clock.now();
    const entity: PeriodAdjustment = {
      id: crypto.randomUUID(),
      kind: "period",
      debtId: v.debtId,
      userId,
      profileId,
      startMonth: v.startMonth,
      endMonth: v.endMonth,
      amount: Money.fromCents(amountCents),
      note: v.note ?? null,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await repos.debtAmountAdjustments.upsert(entity);
    return { adjustmentId: saved.id };
  },
  revalidatePaths: (_data, v) => [`/app/dividas/${v.debtId}`],
});

export const addOverrideAction = action({
  schema: addOverrideSchema,
  handler: async (v, { userId, profileId }) => {
    if (!isValidMonthKey(v.month)) {
      throw new ActionError("Mês inválido.");
    }
    await requireOwnedDebt(v.debtId, userId);

    const amountCents = BigInt(v.amountCents);
    if (amountCents < 0n) throw new ActionError("Valor não pode ser negativo.");

    const now = clock.now();
    const entity: OverrideAdjustment = {
      id: crypto.randomUUID(),
      kind: "override",
      debtId: v.debtId,
      userId,
      profileId,
      month: v.month,
      amount: Money.fromCents(amountCents),
      note: v.note ?? null,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await repos.debtAmountAdjustments.upsert(entity);
    return { adjustmentId: saved.id };
  },
  revalidatePaths: (_data, v) => [`/app/dividas/${v.debtId}`],
});

export const deleteAdjustmentAction = action({
  schema: z.object({
    debtId: z.string(),
    adjustmentId: z.string(),
  }),
  handler: async ({ adjustmentId }, { userId }) => {
    await repos.debtAmountAdjustments.delete(adjustmentId, userId);
  },
  revalidatePaths: (_data, v) => [`/app/dividas/${v.debtId}`],
});
