"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

import { MoneyInput } from "../../../_components/money-input";
import { WizardField } from "@/ui/wizard-field";
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
  defaultDebtId,
}: {
  debts: { id: string; label: string; currentBalanceFormatted: string }[];
  defaultDebtId?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<PayoffActionResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      debtId: defaultDebtId ?? debts[0]?.id ?? "",
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
          <Controller
            control={form.control}
            name="debtId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={`${simSelectClass} h-auto w-full`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {debts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label} - {d.currentBalanceFormatted}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
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
                  result.data.payoffMonth !== null
                    ? `${result.data.payoffMonth} meses`
                    : "Sem previsão"
                }
                tone={result.data.negativeAmortization ? "negative" : "positive"}
                caption={
                  result.data.payoffDate
                    ? `Data prevista: ${DATE_FMT.format(new Date(result.data.payoffDate))}.`
                    : undefined
                }
              />
              <ResultStat label="Total pago" value={result.data.totalPaid} />
              <ResultStat label="Total de juros" value={result.data.totalInterest} />
              {result.data.negativeAmortization ? (
                <p className="text-[0.75rem] font-semibold text-[color:var(--semantic-negative)]">
                  Atenção: o pagamento não cobre os juros. O saldo cresce e a dívida não termina.
                </p>
              ) : null}
            </ResultCard>
            {(() => {
              const debtId = form.getValues("debtId");
              if (!debtId) return null;
              const monthly = form.getValues("monthlyPaymentCents") ?? 0n;
              const extra = form.getValues("extraPaymentCents") ?? 0n;
              const ritmo = monthly + extra;
              return (
                <SimToGoalCta
                  seed={{
                    type: "debt_payoff",
                    debtId,
                    ...(ritmo > 0n ? { monthlyContributionCents: ritmo.toString() } : {}),
                  }}
                />
              );
            })()}
          </>
        ) : (
          <ResultError message={result.message} />
        )
      ) : null}
    </div>
  );
}
