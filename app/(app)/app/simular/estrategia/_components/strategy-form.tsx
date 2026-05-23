"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/app/components/ui/button";

import { MoneyInput } from "../../../_components/money-input";
import { runStrategyAction, type StrategyActionResult } from "../_actions/run-strategy.action";

const formSchema = z.object({
  selectedDebtIds: z.array(z.string().uuid()).min(1, "Selecione ao menos uma dívida."),
  monthlyBudgetCents: z.bigint().positive("Orçamento mensal deve ser positivo."),
});

type FormValues = z.infer<typeof formSchema>;

type DebtItem = { id: string; label: string; currentBalanceFormatted: string };

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

  function toggle(id: string, checked: boolean) {
    const current = form.getValues("selectedDebtIds");
    if (checked) {
      if (!current.includes(id)) form.setValue("selectedDebtIds", [...current, id]);
    } else {
      form.setValue(
        "selectedDebtIds",
        current.filter((x) => x !== id),
      );
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
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="font-medium">Dívidas no plano</legend>
          {debts.map((d) => (
            <label key={d.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(d.id)}
                onChange={(e) => toggle(d.id, e.target.checked)}
                className="h-4 w-4"
              />
              <span>
                {d.label} - {d.currentBalanceFormatted}
              </span>
            </label>
          ))}
          {form.formState.errors.selectedDebtIds ? (
            <span role="alert" className="text-xs text-[color:var(--semantic-negative)]">
              {form.formState.errors.selectedDebtIds.message}
            </span>
          ) : null}
        </fieldset>

        <MoneyInput
          control={form.control}
          name="monthlyBudgetCents"
          label="Orçamento mensal total"
          required
          helper="Quanto você pode destinar por mês para todas as dívidas."
        />

        <Button type="submit" loading={pending}>
          Comparar estratégias
        </Button>
      </form>

      {result ? (
        result.ok ? (
          <section className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StrategyCard
                title="Snowball"
                subtitle="Menor saldo primeiro"
                plan={result.snowball}
                labelById={labelById}
              />
              <StrategyCard
                title="Avalanche"
                subtitle="Maior juro primeiro"
                plan={result.avalanche}
                labelById={labelById}
              />
            </div>
            {interestDelta !== null && interestDelta > 0 ? (
              <p className="glass-light p-4 text-sm text-[color:var(--semantic-positive)]">
                Avalanche poupa{" "}
                <strong>
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(interestDelta)}
                </strong>{" "}
                em juros.
              </p>
            ) : null}
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
    <div className="glass-light p-4">
      <h3 className="text-sm font-semibold text-[color:var(--color-brand-800)]">{title}</h3>
      <p className="mb-2 text-xs opacity-70">{subtitle}</p>
      <ul className="flex flex-col gap-1 text-sm">
        <li>
          Liberdade em:{" "}
          <strong>
            {plan.monthsToFreedom ?? "não no horizonte"}
            {plan.monthsToFreedom !== null ? " meses" : ""}
          </strong>
        </li>
        <li>
          Total pago: <strong>{plan.totalPaid}</strong>
        </li>
        <li>
          Total de juros: <strong>{plan.totalInterest}</strong>
        </li>
        <li>
          <span className="opacity-70">Ordem:</span>
          <ol className="ml-4 mt-1 list-decimal text-xs">
            {plan.order.map((id, idx) => (
              <li key={`${id}-${idx}`}>{labelById.get(id) ?? id}</li>
            ))}
          </ol>
        </li>
      </ul>
    </div>
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
