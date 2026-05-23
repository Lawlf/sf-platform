"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/app/components/ui/button";

import { MoneyInput } from "../../../_components/money-input";
import { runPayoffAction, type PayoffActionResult } from "../_actions/run-payoff.action";

const formSchema = z.object({
  debtId: z.string().uuid(),
  monthlyPaymentCents: z.bigint().positive("Pagamento mensal deve ser positivo."),
  extraPaymentCents: z.bigint().nonnegative().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

export function PayoffForm({
  debts,
}: {
  debts: { id: string; label: string; currentBalanceFormatted: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<PayoffActionResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      debtId: debts[0]?.id ?? "",
      monthlyPaymentCents: 0n as unknown as bigint,
      extraPaymentCents: null,
    },
  });

  async function onSubmit(values: FormValues) {
    setResult(null);
    const fd = new FormData();
    fd.set("debtId", values.debtId);
    fd.set("monthlyPaymentCents", values.monthlyPaymentCents.toString());
    if (values.extraPaymentCents !== null) {
      fd.set("extraPaymentCents", values.extraPaymentCents.toString());
    }
    startTransition(async () => {
      const r = await runPayoffAction(fd);
      setResult(r);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Dívida</span>
          <select
            {...form.register("debtId")}
            className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-2 text-base outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
          >
            {debts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label} - {d.currentBalanceFormatted}
              </option>
            ))}
          </select>
        </label>

        <MoneyInput
          control={form.control}
          name="monthlyPaymentCents"
          label="Pagamento mensal (parcela)"
          required
        />
        <MoneyInput
          control={form.control}
          name="extraPaymentCents"
          label="Pagamento extra (opcional)"
          helper="Adiciona acima da parcela todo mês."
        />

        <Button type="submit" loading={pending}>
          Calcular projeção
        </Button>
      </form>

      {result ? (
        result.ok ? (
          <section className="glass-light p-4">
            <h2 className="mb-2 text-sm font-semibold opacity-80">Resultado</h2>
            <ul className="flex flex-col gap-1 text-sm">
              <li>
                Quitação em: <strong>{result.payoffMonth ?? "não no horizonte"}</strong> meses
              </li>
              {result.payoffDate ? (
                <li>
                  Data prevista: <strong>{DATE_FMT.format(new Date(result.payoffDate))}</strong>
                </li>
              ) : null}
              <li>
                Total pago: <strong>{result.totalPaid}</strong>
              </li>
              <li>
                Total de juros: <strong>{result.totalInterest}</strong>
              </li>
              {result.negativeAmortization ? (
                <li className="text-[color:var(--semantic-negative)]">
                  Atenção: pagamento não cobre os juros. Saldo cresce.
                </li>
              ) : null}
            </ul>
          </section>
        ) : (
          <p role="alert" className="text-sm text-[color:var(--semantic-negative)]">
            {result.message}
          </p>
        )
      ) : null}
    </div>
  );
}
