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
  creditLimitCents: z.bigint().positive("Limite deve ser positivo."),
  currentStatementCents: z.bigint().min(0n, "Nao pode ser negativo."),
  statementDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  revolvingBalanceCents: z.bigint().nullable(),
  revolvingMonthlyRatePct: z.number().nullable(),
  startDate: z.string().min(1, "Informe a data de inicio."),
  expectedEndDate: z.string().nullable().optional(),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

const TODAY = new Date().toISOString().slice(0, 10);

export function CreditCardForm() {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
      creditLimitCents: 0n as unknown as bigint,
      currentStatementCents: 0n as unknown as bigint,
      statementDay: 1,
      dueDay: 10,
      revolvingBalanceCents: null,
      revolvingMonthlyRatePct: null,
      startDate: TODAY,
      expectedEndDate: null,
      notes: null,
    },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const fd = new FormData();
    fd.set("label", values.label);
    fd.set("creditLimitCents", values.creditLimitCents.toString());
    fd.set("currentStatementCents", values.currentStatementCents.toString());
    fd.set("statementDay", String(values.statementDay));
    fd.set("dueDay", String(values.dueDay));
    fd.set(
      "revolvingBalanceCents",
      values.revolvingBalanceCents ? values.revolvingBalanceCents.toString() : "",
    );
    fd.set(
      "revolvingMonthlyRatePct",
      values.revolvingMonthlyRatePct !== null ? String(values.revolvingMonthlyRatePct) : "",
    );
    fd.set("startDate", values.startDate);
    fd.set("expectedEndDate", values.expectedEndDate ?? "");
    fd.set("notes", values.notes ?? "");
    startTransition(async () => {
      const r = await createDebtAction("credit_card", fd);
      if (!r.ok) setServerError(r.message);
    });
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Rotulo</span>
        <input
          {...form.register("label")}
          placeholder="ex: Cartão Nubank"
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
        name="creditLimitCents"
        label="Limite do cartão"
        required
      />

      <MoneyInput
        control={form.control}
        name="currentStatementCents"
        label="Fatura atual em aberto"
        required
        helper="Valor da fatura corrente ainda não paga."
      />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Dia de fechamento</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={31}
          {...form.register("statementDay", { valueAsNumber: true })}
          className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-base outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Dia de vencimento</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={31}
          {...form.register("dueDay", { valueAsNumber: true })}
          className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-base outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
        />
      </label>

      <MoneyInput
        control={form.control}
        name="revolvingBalanceCents"
        label="Saldo rotativo (opcional)"
        helper="Saldo em rotativo de faturas anteriores."
      />

      <RateInput
        control={form.control}
        name="revolvingMonthlyRatePct"
        label="Taxa do rotativo (opcional)"
        helper="Taxa mensal cobrada no rotativo."
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
