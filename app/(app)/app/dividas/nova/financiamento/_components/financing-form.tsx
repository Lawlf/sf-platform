"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/app/components/ui/button";

import { MoneyInput } from "../../../../_components/money-input";
import { RateInput } from "../../../../_components/rate-input";
import { createDebtAction } from "../../../_actions/create-debt.action";

const formSchema = z.object({
  label: z.string().min(1, "Informe um rotulo.").max(120),
  principalCents: z.bigint().positive("Valor deve ser positivo."),
  annualRatePct: z.number().min(0).max(1000),
  termMonths: z.number().int().min(1).max(600),
  amortizationMethod: z.enum(["PRICE", "SAC"]),
  monthlyInsuranceCents: z.bigint().nullable(),
  monthlyAdminFeeCents: z.bigint().nullable(),
  startDate: z.string().min(1, "Informe a data de inicio."),
  expectedEndDate: z.string().nullable().optional(),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

const TODAY = new Date().toISOString().slice(0, 10);

export function FinancingForm() {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
      principalCents: 0n as unknown as bigint,
      annualRatePct: 0,
      termMonths: 60,
      amortizationMethod: "PRICE",
      monthlyInsuranceCents: null,
      monthlyAdminFeeCents: null,
      startDate: TODAY,
      expectedEndDate: null,
      notes: null,
    },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const fd = new FormData();
    fd.set("label", values.label);
    fd.set("principalCents", values.principalCents.toString());
    fd.set("annualRatePct", String(values.annualRatePct));
    fd.set("termMonths", String(values.termMonths));
    fd.set("amortizationMethod", values.amortizationMethod);
    fd.set(
      "monthlyInsuranceCents",
      values.monthlyInsuranceCents ? values.monthlyInsuranceCents.toString() : "",
    );
    fd.set(
      "monthlyAdminFeeCents",
      values.monthlyAdminFeeCents ? values.monthlyAdminFeeCents.toString() : "",
    );
    fd.set("startDate", values.startDate);
    fd.set("expectedEndDate", values.expectedEndDate ?? "");
    fd.set("notes", values.notes ?? "");
    startTransition(async () => {
      const r = await createDebtAction("financing", fd);
      if (!r.ok) setServerError(r.message);
      // success -> action redirects, transition never returns
    });
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Rotulo</span>
        <input
          {...form.register("label")}
          placeholder="ex: Financiamento apartamento"
          className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-base outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
        />
        {form.formState.errors.label ? (
          <span role="alert" className="text-xs text-[color:var(--color-negative)]">
            {form.formState.errors.label.message}
          </span>
        ) : null}
      </label>

      <MoneyInput
        control={form.control}
        name="principalCents"
        label="Valor financiado"
        required
        helper="Valor original do financiamento."
      />

      <RateInput
        control={form.control}
        name="annualRatePct"
        label="Taxa anual"
        helper="Como informado em contrato CET (anual)."
        required
      />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Prazo (meses)</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={600}
          {...form.register("termMonths", { valueAsNumber: true })}
          className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-base outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
        />
      </label>

      <fieldset className="flex flex-col gap-1 text-sm">
        <legend className="font-medium">Sistema de amortizacao</legend>
        <label className="flex items-center gap-2">
          <input type="radio" value="PRICE" {...form.register("amortizationMethod")} />
          <span>Price (parcela fixa)</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" value="SAC" {...form.register("amortizationMethod")} />
          <span>SAC (parcela decrescente)</span>
        </label>
      </fieldset>

      <MoneyInput
        control={form.control}
        name="monthlyInsuranceCents"
        label="Seguro mensal (opcional)"
      />
      <MoneyInput
        control={form.control}
        name="monthlyAdminFeeCents"
        label="Taxa administrativa mensal (opcional)"
      />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Data de início</span>
        <input
          type="date"
          {...form.register("startDate")}
          className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-base outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Data prevista de término (opcional)</span>
        <input
          type="date"
          {...form.register("expectedEndDate")}
          className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-base outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Notas (opcional)</span>
        <textarea
          rows={3}
          {...form.register("notes")}
          className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-base outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
        />
      </label>

      {serverError ? (
        <span role="alert" className="text-sm text-[color:var(--color-negative)]">
          {serverError}
        </span>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Cadastrar dívida"}
      </Button>
    </form>
  );
}
