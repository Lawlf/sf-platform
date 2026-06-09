"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/app/components/ui/button";

import { MoneyInput } from "../../../_components/money-input";
import { WizardField } from "../../../dividas/nova/_components/wizard-field";
import {
  ResultCard,
  ResultError,
  ResultHeadline,
  ResultHighlight,
  ResultStat,
} from "../../_components/sim-result";
import { SimToGoalCta } from "../../_components/sim-to-goal-cta";
import { runStrategyAction, type StrategyActionResult } from "../_actions/run-strategy.action";

const formSchema = z.object({
  selectedDebtIds: z.array(z.string().uuid()).min(1, "Selecione ao menos uma dívida."),
  monthlyBudgetCents: z.bigint().positive("Orçamento mensal deve ser positivo."),
});

type FormValues = z.infer<typeof formSchema>;

type DebtItem = { id: string; label: string; currentBalanceFormatted: string };

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function StrategyForm({ debts }: { debts: DebtItem[] }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<StrategyActionResult | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedDebtIds: debts.map((d) => d.id),
      monthlyBudgetCents: 0n as unknown as bigint,
    },
  });

  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of debts) map.set(d.id, d.label);
    return map;
  }, [debts]);

  const selected = form.watch("selectedDebtIds");

  function toggle(id: string) {
    const current = form.getValues("selectedDebtIds");
    if (current.includes(id)) {
      form.setValue(
        "selectedDebtIds",
        current.filter((x) => x !== id),
        { shouldValidate: true },
      );
    } else {
      form.setValue("selectedDebtIds", [...current, id], { shouldValidate: true });
    }
  }

  async function onSubmit(values: FormValues) {
    setResult(null);
    const fd = new FormData();
    const isAll = values.selectedDebtIds.length === debts.length;
    fd.set("debtIds", isAll ? "" : values.selectedDebtIds.join(","));
    fd.set("monthlyBudgetCents", values.monthlyBudgetCents.toString());
    startTransition(async () => {
      const r = await runStrategyAction(fd);
      setResult(r);
    });
  }

  const interestDelta = useMemo(() => {
    if (!result || !result.ok) return null;
    const snowballNumber = parseCurrencyToNumber(result.snowball.totalInterest);
    const avalancheNumber = parseCurrencyToNumber(result.avalanche.totalInterest);
    if (snowballNumber === null || avalancheNumber === null) return null;
    return snowballNumber - avalancheNumber;
  }, [result]);

  return (
    <div className="flex flex-col gap-4">
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="glass-light flex flex-col gap-3 p-4"
      >
        <WizardField
          label="Dívidas no plano"
          error={form.formState.errors.selectedDebtIds?.message}
        >
          <div className="flex flex-col gap-2">
            {debts.map((d) => {
              const active = selected.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggle(d.id)}
                  aria-pressed={active}
                  className={`flex items-center gap-3 rounded-xl border-[1.5px] p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)] ${
                    active
                      ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/12"
                      : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)] hover:bg-[color:var(--surface-2)]"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors ${
                      active
                        ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)] text-white"
                        : "border-[color:var(--border-strong)] text-transparent"
                    }`}
                  >
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
                      {d.label}
                    </span>
                    <span className="block text-[0.6875rem] text-[color:var(--text-muted)]">
                      {d.currentBalanceFormatted}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </WizardField>

        <MoneyInput
          control={form.control}
          name="monthlyBudgetCents"
          label="Orçamento mensal total"
          required
          helper="Quanto você pode destinar por mês para todas as dívidas."
        />

        <Button type="submit" loading={pending} className="mt-3 w-full">
          Comparar estratégias
        </Button>
      </form>

      {result ? (
        result.ok ? (
          <section className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <StrategyCard
                title="Menor saldo primeiro"
                subtitle="Quita a dívida menor antes"
                plan={result.snowball}
                labelById={labelById}
              />
              <StrategyCard
                title="Juro mais alto primeiro"
                subtitle="Ataca o juro mais caro antes"
                plan={result.avalanche}
                labelById={labelById}
              />
            </div>
            {interestDelta !== null && interestDelta > 0 ? (
              <ResultHighlight>
                Pagar o juro mais alto primeiro economiza{" "}
                <strong>{BRL.format(interestDelta)}</strong> em juros.
              </ResultHighlight>
            ) : null}
            {(() => {
              // Vincula a meta à primeira dívida da estratégia vencedora (a mais
              // barata em juros). Sem ritmo: o orçamento cobre todas as dívidas,
              // não só essa, então a meta usa o pagamento próprio da dívida.
              const best = (interestDelta ?? 0) > 0 ? result.avalanche : result.snowball;
              const firstId = best.order[0];
              if (!firstId) return null;
              const firstLabel = labelById.get(firstId) ?? "essa dívida";
              return (
                <SimToGoalCta
                  seed={{ type: "debt_payoff", debtId: firstId }}
                  label={`Começar a quitar pela ${firstLabel}`}
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

function StrategyCard({
  title,
  subtitle,
  plan,
  labelById,
}: {
  title: string;
  subtitle: string;
  plan: {
    order: string[];
    monthsToFreedom: number | null;
    totalInterest: string;
    totalPaid: string;
  };
  labelById: Map<string, string>;
}) {
  return (
    <ResultCard title={title} subtitle={subtitle}>
      <ResultHeadline
        value={
          plan.monthsToFreedom !== null ? `${plan.monthsToFreedom} meses` : "Não quita nesse orçamento"
        }
        caption="para zerar todas."
      />
      <ResultStat label="Total pago" value={plan.totalPaid} />
      <ResultStat label="Total de juros" value={plan.totalInterest} />
      <div>
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]">
          Ordem de pagamento
        </span>
        <ol className="mt-1 list-decimal pl-5 text-[0.75rem] text-[color:var(--text-primary)]">
          {plan.order.map((id, idx) => (
            <li key={`${id}-${idx}`}>{labelById.get(id) ?? id}</li>
          ))}
        </ol>
      </div>
    </ResultCard>
  );
}

function parseCurrencyToNumber(formatted: string): number | null {
  const digits = formatted
    .replace(/[^\d,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number.parseFloat(digits);
  return Number.isFinite(n) ? n : null;
}
