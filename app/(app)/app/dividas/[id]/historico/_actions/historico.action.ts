"use server";

import crypto from "node:crypto";

import { revalidatePath } from "next/cache";
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
import { SystemClock } from "@/infrastructure/clock/system-clock";
import { DrizzleDebtAmountAdjustmentRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt-amount-adjustment.repository";
import { DrizzleDebtRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-debt.repository";
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
  const debts = new DrizzleDebtRepository();
  const debt = await debts.findById(debtId);
  if (!debt || debt.userId !== user.id) {
    throw new Error("Dívida não encontrada.");
  }

  const adjustmentsRepo = new DrizzleDebtAmountAdjustmentRepository();
  const adjustments = await adjustmentsRepo.listForDebt(debtId, user.id);

  const now = new SystemClock().now();
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + DEFAULT_FUTURE_MONTHS, 1));
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - DEFAULT_PAST_MONTHS, 1));
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

export type ActionResult =
  | { ok: true; adjustmentId: string }
  | { ok: false; message: string };

export async function addPeriodAction(raw: AddPeriodInput): Promise<ActionResult> {
  const parsed = addPeriodSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const v = parsed.data;
  if (v.endMonth !== null && compareMonthKey(v.endMonth, v.startMonth) < 0) {
    return { ok: false, message: "Mês final deve ser igual ou depois do inicial." };
  }
  const user = await requireUser();

  const debts = new DrizzleDebtRepository();
  const debt = await debts.findById(v.debtId);
  if (!debt || debt.userId !== user.id) {
    return { ok: false, message: "Dívida não encontrada." };
  }

  const amountCents = BigInt(v.amountCents);
  if (amountCents < 0n) return { ok: false, message: "Valor não pode ser negativo." };

  const now = new SystemClock().now();
  const entity: PeriodAdjustment = {
    id: crypto.randomUUID(),
    kind: "period",
    debtId: v.debtId,
    userId: user.id,
    startMonth: v.startMonth,
    endMonth: v.endMonth,
    amount: Money.fromCents(amountCents),
    note: v.note ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const repo = new DrizzleDebtAmountAdjustmentRepository();
  const saved = await repo.upsert(entity);
  revalidatePath(`/app/dividas/${v.debtId}/historico`);
  revalidatePath(`/app/dividas/${v.debtId}`);
  return { ok: true, adjustmentId: saved.id };
}

export async function addOverrideAction(raw: AddOverrideInput): Promise<ActionResult> {
  const parsed = addOverrideSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const v = parsed.data;
  if (!isValidMonthKey(v.month)) {
    return { ok: false, message: "Mês inválido." };
  }
  const user = await requireUser();

  const debts = new DrizzleDebtRepository();
  const debt = await debts.findById(v.debtId);
  if (!debt || debt.userId !== user.id) {
    return { ok: false, message: "Dívida não encontrada." };
  }

  const amountCents = BigInt(v.amountCents);
  if (amountCents < 0n) return { ok: false, message: "Valor não pode ser negativo." };

  const now = new SystemClock().now();
  const entity: OverrideAdjustment = {
    id: crypto.randomUUID(),
    kind: "override",
    debtId: v.debtId,
    userId: user.id,
    month: v.month,
    amount: Money.fromCents(amountCents),
    note: v.note ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const repo = new DrizzleDebtAmountAdjustmentRepository();
  const saved = await repo.upsert(entity);
  revalidatePath(`/app/dividas/${v.debtId}/historico`);
  revalidatePath(`/app/dividas/${v.debtId}`);
  return { ok: true, adjustmentId: saved.id };
}

export async function deleteAdjustmentAction(
  debtId: string,
  adjustmentId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser();
  const repo = new DrizzleDebtAmountAdjustmentRepository();
  await repo.delete(adjustmentId, user.id);
  revalidatePath(`/app/dividas/${debtId}/historico`);
  revalidatePath(`/app/dividas/${debtId}`);
  return { ok: true };
}
