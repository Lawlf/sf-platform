"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/app/components/ui/button";

import { MoneyInput } from "../../../_components/money-input";
import { runExtraAction, type ExtraActionResult } from "../_actions/run-extra.action";

const formSchema = z.object({
  debtId: z.string().uuid(),
  monthlyPaymentCents: z.bigint().positive("Pagamento mensal deve ser positivo."),
  extraPaymentCents: z.bigint().positive("Pagamento extra deve ser positivo."),
});

type FormValues = z.infer<typeof formSchema>;

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
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Dívida</span>
          <select
            {...form.register("debtId")}
            className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-base outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
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
          label="Pagamento extra mensal"
          required
          helper="Valor adicional acima da parcela todo mês."
        />

        <Button type="submit" disabled={pending}>
          {pending ? "Calculando..." : "Comparar cenários"}
        </Button>
      </form>

      {result ? (
        result.ok ? (
          <section className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-light p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-70">
                  Sem extra
                </h3>
                <ul className="flex flex-col gap-1 text-sm">
                  <li>
                    Quitação:{" "}
                    <strong>
                      {result.baselinePayoffMonth ?? "não no horizonte"}
                      {result.baselinePayoffMonth !== null ? " meses" : ""}
                    </strong>
                  </li>
                  <li>
                    Juros: <strong>{result.baselineInterestFormatted}</strong>
                  </li>
                </ul>
              </div>
              <div className="glass-light p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-70">
                  Com extra
                </h3>
                <ul className="flex flex-col gap-1 text-sm">
                  <li>
                    Quitação:{" "}
                    <strong>
                      {result.withExtraPayoffMonth ?? "não no horizonte"}
                      {result.withExtraPayoffMonth !== null ? " meses" : ""}
                    </strong>
                  </li>
                  <li>
                    Juros: <strong>{result.withExtraInterestFormatted}</strong>
                  </li>
                </ul>
              </div>
            </div>
            <p className="glass-light p-4 text-sm text-[color:var(--color-positive)]">
              Você economiza <strong>{result.monthsSaved}</strong> meses e{" "}
              <strong>{result.interestSavedFormatted}</strong> em juros.
            </p>
          </section>
        ) : (
          <p role="alert" className="text-sm text-[color:var(--color-negative)]">
            {result.message}
          </p>
        )
      ) : null}
    </div>
  );
}
