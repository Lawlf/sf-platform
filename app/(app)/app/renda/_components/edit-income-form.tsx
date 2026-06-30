"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Spinner } from "@/app/components/ui/spinner";
import type { IncomeSourceBreakdown } from "@/domain/entities/income.entity";
import { type Currency, CURRENCIES } from "@/domain/value-objects/money.vo";

import { MoneyInput } from "../../_components/money-input";
import { queryKeys } from "../../_lib/query-keys";
import {
  WorkBreakdownFields,
  type WorkBreakdownValue,
} from "../../simular/valor-hora/_components/work-breakdown-fields";
import { updateIncomeAction } from "../_actions/update-income.action";

const formSchema = z.object({
  label: z.string().min(1, "Informe um nome.").max(120),
  amountCents: z.bigint().positive("Valor deve ser positivo."),
  currency: z.enum(CURRENCIES),
  frequency: z.enum(["monthly", "weekly", "one_off"]),
  startDate: z.string().min(1, "Informe a data inicial."),
  endDate: z.string().nullable().optional(),
  paymentDay: z.number().int().min(1).max(31).nullable(),
  isEstimated: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const fieldClass =
  "w-full rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[14px] py-[12px] text-[0.9375rem] text-[color:var(--text-primary)] outline-none transition-colors focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30";

const labelClass =
  "mb-1.5 block text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-primary)] opacity-80";

const segButtonClass = (active: boolean) =>
  `focus-ring rounded-xl border-[1.5px] px-[14px] py-[12px] text-[0.875rem] font-semibold transition-colors ${
    active
      ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/10 text-[color:var(--text-primary)]"
      : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)] text-[color:var(--text-muted)]"
  }`;

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface EditIncomeFormProps {
  income: {
    id: string;
    label: string;
    amountCents: string;
    currency: Currency;
    frequency: "monthly" | "weekly" | "one_off";
    startDateIso: string;
    endDateIso: string | null;
    paymentDay: number | null;
    isEstimated: boolean;
    sourceBreakdown: IncomeSourceBreakdown | null;
  };
}

export function EditIncomeForm({ income }: EditIncomeFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const hasBreakdown = income.sourceBreakdown != null;
  const [work, setWork] = useState<WorkBreakdownValue | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: income.label,
      amountCents: BigInt(income.amountCents),
      currency: income.currency,
      frequency: income.frequency,
      startDate: income.startDateIso,
      endDate: income.endDateIso,
      paymentDay: income.paymentDay ?? null,
      isEstimated: income.isEstimated,
    },
  });

  const currency = form.watch("currency");
  const frequency = form.watch("frequency");
  const isEstimated = form.watch("isEstimated");
  const [showEnd, setShowEnd] = useState(Boolean(income.endDateIso));
  const [showStart, setShowStart] = useState(() => {
    const start = new Date(income.startDateIso);
    return Number.isFinite(start.getTime()) && start.getTime() > Date.now();
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const fd = new FormData();
    fd.set("incomeId", income.id);
    fd.set("label", values.label);
    fd.set(
      "amountCents",
      hasBreakdown && work ? work.monthCents.toString() : values.amountCents.toString(),
    );
    fd.set("currency", values.currency);
    fd.set("frequency", values.frequency);
    fd.set("startDate", values.startDate);
    fd.set("endDate", values.endDate ?? "");
    fd.set(
      "paymentDay",
      values.frequency === "monthly" && values.paymentDay ? String(values.paymentDay) : "",
    );
    if (values.isEstimated || hasBreakdown) fd.set("isEstimated", "true");
    if (hasBreakdown && work) fd.set("sourceBreakdown", JSON.stringify(work.breakdown));
    startTransition(async () => {
      const r = await updateIncomeAction(fd);
      if (!r.ok) {
        setServerError(r.message);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.incomes });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot });
      await queryClient.invalidateQueries({ queryKey: ["timeline"] });
      await queryClient.invalidateQueries({ queryKey: ["planning", "projection"] });
      router.push("/app/renda");
    });
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div>
        <label className={labelClass} htmlFor="renda-edit-label">
          Nome
        </label>
        <input
          id="renda-edit-label"
          {...form.register("label")}
          placeholder="Ex: Salário, freela, aluguel, comissão"
          className={fieldClass}
        />
        {form.formState.errors.label ? (
          <span role="alert" className="mt-1 text-[0.6875rem] text-[color:var(--semantic-negative)]">
            {form.formState.errors.label.message}
          </span>
        ) : null}
      </div>

      {hasBreakdown && income.sourceBreakdown ? (
        <div className="flex flex-col gap-2">
          <WorkBreakdownFields initial={income.sourceBreakdown} onChange={setWork} />
          {work && work.monthCents > 0n ? (
            <p className="text-[0.8125rem] font-semibold text-[color:var(--color-brand-800)]">
              Estimativa do mês: {brl(work.monthCents)}
            </p>
          ) : null}
          <p className="rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[14px] py-[12px] text-[0.8125rem] leading-snug text-[color:var(--text-muted)]">
            Isso é uma média, não receita garantida. Plantão cancelado, mês mais fraco: a
            conta muda. Você recalcula quando quiser.
          </p>
        </div>
      ) : (
        <MoneyInput
          control={form.control}
          name="amountCents"
          label="Valor"
          required
          currency={currency}
        />
      )}

      {hasBreakdown ? null : (
        <div>
          <span className={labelClass}>Esse valor é fixo ou varia?</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => form.setValue("isEstimated", false)}
              aria-pressed={!isEstimated}
              className={segButtonClass(!isEstimated)}
            >
              É sempre esse
            </button>
            <button
              type="button"
              onClick={() => form.setValue("isEstimated", true)}
              aria-pressed={isEstimated}
              className={segButtonClass(isEstimated)}
            >
              Varia mês a mês
            </button>
          </div>
          {isEstimated ? (
            <p className="mt-2 text-[0.75rem] leading-snug text-[color:var(--text-muted)]">
              Pra comissão, freela ou renda de PJ. A gente trata como média, não
              como receita garantida.
            </p>
          ) : null}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="renda-edit-frequency">
            Com que frequência cai?
          </label>
          <Controller
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="renda-edit-frequency"
                  className="h-auto w-full rounded-xl border-[1.5px] bg-[color:var(--surface-1)] px-[14px] py-[12px] text-[0.9375rem]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Todo mês</SelectItem>
                  <SelectItem value="weekly">Toda semana</SelectItem>
                  <SelectItem value="one_off">Uma vez só</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {frequency === "monthly" ? (
          <div>
            <label className={labelClass} htmlFor="renda-edit-payment-day">
              Que dia do mês?
            </label>
            <Controller
              control={form.control}
              name="paymentDay"
              render={({ field }) => (
                <Select
                  value={field.value != null ? String(field.value) : "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))}
                >
                  <SelectTrigger
                    id="renda-edit-payment-day"
                    className="h-auto w-full rounded-xl border-[1.5px] bg-[color:var(--surface-1)] px-[14px] py-[12px] text-[0.9375rem]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não tem dia certo</SelectItem>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        Dia {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        ) : (
          <div>
            <label className={labelClass} htmlFor="renda-edit-start">
              {frequency === "one_off" ? "Quando caiu ou vai cair?" : "A partir de quando?"}
            </label>
            <input
              id="renda-edit-start"
              type="date"
              {...form.register("startDate")}
              className={fieldClass}
            />
          </div>
        )}
      </div>

      {frequency === "monthly" ? (
        showStart ? (
          <div>
            <label className={labelClass} htmlFor="renda-edit-start-monthly">
              A partir de quando?
            </label>
            <input
              id="renda-edit-start-monthly"
              type="date"
              {...form.register("startDate")}
              className={fieldClass}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowStart(true)}
            className="focus-ring -mt-1 w-fit text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
          >
            Ainda não recebo essa renda
          </button>
        )
      ) : null}

      {showEnd ? (
        <div>
          <label className={labelClass} htmlFor="renda-edit-end">
            Quando essa renda acaba?
          </label>
          <input
            id="renda-edit-end"
            type="date"
            {...form.register("endDate")}
            className={fieldClass}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowEnd(true)}
          className="focus-ring w-fit text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
        >
          Essa renda vai acabar um dia? (ex: contrato, freela)
        </button>
      )}

      {serverError ? (
        <span role="alert" className="text-sm text-[color:var(--semantic-negative)]">
          {serverError}
        </span>
      ) : null}

      <div className="sticky bottom-3 z-20 rounded-2xl bg-[color:var(--surface-1)]/95 p-3 backdrop-blur-xl md:static md:bg-transparent md:p-0 md:backdrop-blur-none">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
          className="focus-ring relative flex w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-3 text-[0.875rem] font-bold text-white shadow-[0_6px_16px_rgba(239,122,26,0.3)] transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className={pending ? "opacity-0" : "opacity-100"}>Salvar alterações</span>
          {pending ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <Spinner size={18} />
            </span>
          ) : null}
        </button>
      </div>
    </form>
  );
}
