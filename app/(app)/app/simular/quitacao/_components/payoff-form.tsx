"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/app/components/ui/button";

import { MoneyInput } from "../../../_components/money-input";
import { WizardField } from "../../../dividas/nova/_components/wizard-field";
import {
  ResultCard,
  ResultError,
  ResultHeadline,
  ResultStat,
  simSelectClass,
} from "../../_components/sim-result";
import { SimToGoalCta } from "../../_components/sim-to-goal-cta";
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
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="glass-light flex flex-col gap-3 p-4"
      >
        <WizardField label="Dívida">
          <div className="relative">
            <select {...form.register("debtId")} className={simSelectClass}>
              {debts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label} - {d.currentBalanceFormatted}
                </option>
              ))}
            </select>
            <ChevronDown
              size={18}
              strokeWidth={2}
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]"
            />
          </div>
        </WizardField>

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

        <Button type="submit" loading={pending} className="mt-3 w-full">
          Calcular projeção
        </Button>
      </form>

      {result ? (
        result.ok ? (
          <>
            <ResultCard title="Resultado">
              <ResultHeadline
                value={
                  result.payoffMonth !== null ? `${result.payoffMonth} meses` : "Sem previsão"
                }
                tone={result.negativeAmortization ? "negative" : "positive"}
                caption={
                  result.payoffDate
                    ? `Data prevista: ${DATE_FMT.format(new Date(result.payoffDate))}.`
                    : undefined
                }
              />
              <ResultStat label="Total pago" value={result.totalPaid} />
              <ResultStat label="Total de juros" value={result.totalInterest} />
              {result.negativeAmortization ? (
                <p className="text-[0.75rem] font-semibold text-[color:var(--semantic-negative)]">
                  Atenção: o pagamento não cobre os juros. O saldo cresce e a dívida não termina.
                </p>
              ) : null}
            </ResultCard>
            {(() => {
              const debtId = form.getValues("debtId");
              return debtId ? <SimToGoalCta seed={{ type: "debt_payoff", debtId }} /> : null;
            })()}
          </>
        ) : (
          <ResultError message={result.message} />
        )
      ) : null}
    </div>
  );
}
