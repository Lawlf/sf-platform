"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { CURRENCIES, type Currency } from "@/domain/value-objects/money.vo";

import type { IncomeFreeBalanceEvent } from "../../_actions/_free-balance-event";
import { MoneyInput } from "../../_components/money-input";
import { incomeCopy } from "../../_lib/copy/catalogs";
import { useCopy } from "../../_lib/copy/use-copy";
import { queryKeys } from "../../_lib/query-keys";
import { parseIncomeSeed } from "../../simular/_lib/income-seed";
import { createIncomeAction } from "../_actions/create-income.action";

import { IncomeFreeBalanceResult } from "./income-free-balance-result";

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

const TODAY = new Date().toISOString().slice(0, 10);

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

export function IncomeForm({ defaultCurrency = "BRL" }: { defaultCurrency?: Currency } = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const t = useCopy(incomeCopy);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<IncomeFreeBalanceEvent | null>(null);

  // Vindo de um simulador (ex: salário-CLT, 13º, férias, rescisão): pré-preenche
  // valor/frequência/rótulo para a pessoa só conferir e salvar.
  const seed = parseIncomeSeed(Object.fromEntries(searchParams.entries()));
  const seedBreakdown = seed?.breakdownJson ?? null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: seed?.label ?? "",
      amountCents: (seed ? BigInt(seed.amountCents) : 0n) as unknown as bigint,
      currency: defaultCurrency,
      frequency: seed?.frequency ?? "monthly",
      startDate: TODAY,
      endDate: null,
      paymentDay: null,
      isEstimated: seedBreakdown != null,
    },
  });

  const currency = form.watch("currency");
  const frequency = form.watch("frequency");
  const isEstimated = form.watch("isEstimated");
  const [showEnd, setShowEnd] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [showDetails, setShowDetails] = useState(
    seed?.frequency != null && seed.frequency !== "monthly",
  );

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const fd = new FormData();
    fd.set("label", values.label);
    fd.set("amountCents", values.amountCents.toString());
    fd.set("currency", values.currency);
    fd.set("frequency", values.frequency);
    fd.set("startDate", values.startDate);
    fd.set("endDate", values.endDate ?? "");
    fd.set(
      "paymentDay",
      values.frequency === "monthly" && values.paymentDay ? String(values.paymentDay) : "",
    );
    if (values.isEstimated || seedBreakdown != null) fd.set("isEstimated", "true");
    if (seedBreakdown != null) fd.set("sourceBreakdown", seedBreakdown);
    startTransition(async () => {
      const r = await createIncomeAction(fd);
      if (!r.ok) {
        setServerError(r.message);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.incomes });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot });
      await queryClient.invalidateQueries({ queryKey: ["timeline"] });
      await queryClient.invalidateQueries({ queryKey: ["planning", "projection"] });
      if (r.data?.event) {
        setResult(r.data.event);
        return;
      }
      router.push("/app/renda");
    });
  }

  if (result) {
    return <IncomeFreeBalanceResult event={result} onDone={() => router.push("/app/renda")} />;
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <p className="rounded-xl bg-[color:var(--surface-2)] px-3.5 py-2.5 text-[0.75rem] leading-snug text-[color:var(--text-secondary)]">
        Use aqui o que entra todo mês, mesmo que o valor varie. Recebimento de uma vez só? Registra
        em Entrada ou saída.
      </p>
      <div>
        <label className={labelClass} htmlFor="renda-label">
          Nome
        </label>
        <input
          id="renda-label"
          {...form.register("label")}
          placeholder={t("form.namePlaceholder")}
          className={fieldClass}
          aria-invalid={form.formState.errors.label ? true : undefined}
          aria-describedby={form.formState.errors.label ? "renda-label-error" : undefined}
        />
        {form.formState.errors.label ? (
          <span
            id="renda-label-error"
            role="alert"
            className="mt-1 text-[0.6875rem] text-[color:var(--semantic-negative)]"
          >
            {form.formState.errors.label.message}
          </span>
        ) : null}
      </div>

      <MoneyInput
        control={form.control}
        name="amountCents"
        label="Valor"
        required
        currency={currency}
      />
      {t("form.cltNudge") ? (
        <Link
          href={"/app/simular/salario-clt" as Route}
          className="focus-ring -mt-1 w-fit text-[0.75rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
        >
          {t("form.cltNudge")}
        </Link>
      ) : null}

      {seedBreakdown != null ? null : (
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

      {frequency === "monthly" ? (
        <div>
          <label className={labelClass} htmlFor="renda-payment-day">
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
                  id="renda-payment-day"
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
      ) : null}

      {frequency === "monthly" ? (
        showStart ? (
          <div>
            <label className={labelClass} htmlFor="renda-start-monthly">
              A partir de quando?
            </label>
            <input
              id="renda-start-monthly"
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

      {showDetails ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="renda-frequency">
                Com que frequência cai?
              </label>
              <Controller
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="renda-frequency"
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

            {frequency === "monthly" ? null : (
              <div>
                <label className={labelClass} htmlFor="renda-start">
                  {frequency === "one_off" ? "Quando caiu ou vai cair?" : "A partir de quando?"}
                </label>
                <input
                  id="renda-start"
                  type="date"
                  {...form.register("startDate")}
                  className={fieldClass}
                />
              </div>
            )}
          </div>

          {showEnd ? (
            <div>
              <label className={labelClass} htmlFor="renda-end">
                Quando essa renda acaba?
              </label>
              <input
                id="renda-end"
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
        </>
      ) : (
        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className="focus-ring w-fit text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
        >
          Cai todo mês? Ajustar frequência e prazo
        </button>
      )}

      {seedBreakdown != null ? (
        <p className="rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[14px] py-[12px] text-[0.8125rem] leading-snug text-[color:var(--text-muted)]">
          Isso é uma média, não receita garantida. Plantão cancelado, mês mais fraco: a
          conta muda. Você recalcula quando quiser.
        </p>
      ) : null}

      {serverError ? (
        <span role="alert" className="text-sm text-[color:var(--semantic-negative)]">
          {serverError}
        </span>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className="focus-ring relative mt-1 flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-4 py-3 text-[0.875rem] font-bold text-white shadow-[0_6px_16px_rgba(239,122,26,0.3)] transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className={pending ? "opacity-0" : "opacity-100"}>Adicionar renda</span>
        {pending ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner size={18} />
          </span>
        ) : null}
      </button>
    </form>
  );
}
