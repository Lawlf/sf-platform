"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Spinner } from "@/app/components/ui/spinner";
import { CURRENCIES, type Currency } from "@/domain/value-objects/money.vo";

import { MoneyInput } from "../../_components/money-input";
import { queryKeys } from "../../_lib/query-keys";
import { parseIncomeSeed } from "../../simular/_lib/income-seed";
import { createIncomeAction } from "../_actions/create-income.action";

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

export function IncomeForm({ defaultCurrency = "BRL" }: { defaultCurrency?: Currency } = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  // Vindo de um simulador (ex: salário-CLT, 13º, férias, rescisão): pré-preenche
  // valor/frequência/rótulo para a pessoa só conferir e salvar.
  const seed = parseIncomeSeed(Object.fromEntries(searchParams.entries()));

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: seed?.label ?? "",
      amountCents: (seed ? BigInt(seed.amountCents) : 0n) as unknown as bigint,
      currency: defaultCurrency,
      frequency: seed?.frequency ?? "monthly",
      startDate: TODAY,
      endDate: null,
      paymentDay: 5,
      isEstimated: false,
    },
  });

  const currency = form.watch("currency");
  const frequency = form.watch("frequency");
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
    if (values.isEstimated) fd.set("isEstimated", "true");
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
      router.push("/app/renda");
    });
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div>
        <label className={labelClass} htmlFor="renda-label">
          Nome
        </label>
        <input
          id="renda-label"
          {...form.register("label")}
          placeholder="Ex: Salário, freela, aluguel, comissão"
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
      <Link
        href={"/app/simular/salario-clt" as Route}
        className="focus-ring -mt-1 w-fit text-[0.75rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
      >
        Só sei o salário no papel? Calcular o que cai na conta
      </Link>

      {frequency === "monthly" ? (
        <div>
          <label className={labelClass} htmlFor="renda-payment-day">
            Que dia costuma cair?
          </label>
          <select
            id="renda-payment-day"
            {...form.register("paymentDay", { setValueAs: (v) => (v ? Number(v) : null) })}
            className={fieldClass}
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                Dia {d}
              </option>
            ))}
          </select>
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
              <select id="renda-frequency" {...form.register("frequency")} className={fieldClass}>
                <option value="monthly">Todo mês</option>
                <option value="weekly">Toda semana</option>
                <option value="one_off">Uma vez só</option>
              </select>
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

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-[14px] py-[12px]">
            <input
              type="checkbox"
              {...form.register("isEstimated")}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--color-brand-500)]"
            />
            <span className="text-[0.8125rem] leading-snug text-[color:var(--text-primary)]">
              Esse valor varia mês a mês (é uma média)
              <span className="mt-0.5 block text-[0.75rem] text-[color:var(--text-muted)]">
                Pra comissão, freela ou renda de PJ. Tratamos como estimativa,
                não como receita garantida.
              </span>
            </span>
          </label>
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
