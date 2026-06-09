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
  ResultHighlight,
  ResultStat,
  simSelectClass,
} from "../../_components/sim-result";
import { SimToGoalCta } from "../../_components/sim-to-goal-cta";
import { runExtraAction, type ExtraActionResult } from "../_actions/run-extra.action";

const formSchema = z.object({
  debtId: z.string().uuid(),
  monthlyPaymentCents: z.bigint().positive("Pagamento mensal deve ser positivo."),
  extraPaymentCents: z.bigint().positive("Pagamento extra deve ser positivo."),
});

type FormValues = z.infer<typeof formSchema>;

function payoffLabel(month: number | null): string {
  return month !== null ? `${month} meses` : "Sem previsão";
}

export function ExtraForm({
  debts,
}: {
  debts: { id: string; label: string; currentBalanceFormatted: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ExtraActionResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      debtId: debts[0]?.id ?? "",
      monthlyPaymentCents: 0n as unknown as bigint,
      extraPaymentCents: 0n as unknown as bigint,
    },
  });

  async function onSubmit(values: FormValues) {
    setResult(null);
    const fd = new FormData();
    fd.set("debtId", values.debtId);
    fd.set("monthlyPaymentCents", values.monthlyPaymentCents.toString());
    fd.set("extraPaymentCents", values.extraPaymentCents.toString());
    startTransition(async () => {
      const r = await runExtraAction(fd);
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
          label="Pagamento extra mensal"
          required
          helper="Valor adicional acima da parcela todo mês."
        />

        <Button type="submit" loading={pending} className="mt-3 w-full">
          Comparar cenários
        </Button>
      </form>

      {result ? (
        result.ok ? (
          <section className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <ResultCard title="Sem extra" subtitle="Só com a parcela atual">
                <ResultStat label="Quitação" value={payoffLabel(result.baselinePayoffMonth)} />
                <ResultStat label="Juros" value={result.baselineInterestFormatted} />
              </ResultCard>
              <ResultCard title="Com extra" subtitle="Parcela + valor adicional">
                <ResultStat label="Quitação" value={payoffLabel(result.withExtraPayoffMonth)} />
                <ResultStat label="Juros" value={result.withExtraInterestFormatted} />
              </ResultCard>
            </div>
            <ResultHighlight>
              Pagando o extra você quita <strong>{result.monthsSaved}</strong> meses antes e economiza{" "}
              <strong>{result.interestSavedFormatted}</strong> em juros.
            </ResultHighlight>
            {(() => {
              const debtId = form.getValues("debtId");
              if (!debtId) return null;
              const ritmo =
                (form.getValues("monthlyPaymentCents") ?? 0n) +
                (form.getValues("extraPaymentCents") ?? 0n);
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
          </section>
        ) : (
          <ResultError message={result.message} />
        )
      ) : null}
    </div>
  );
}
