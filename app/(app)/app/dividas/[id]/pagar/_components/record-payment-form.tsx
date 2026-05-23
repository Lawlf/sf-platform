"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/app/components/ui/button";

import { MoneyInput } from "../../../../_components/money-input";
import { queryKeys } from "../../../../_lib/query-keys";
import { WizardField, wizardInputClass } from "../../../nova/_components/wizard-field";
import { WizardRadioCard } from "../../../nova/_components/wizard-radio-card";
import { recordPaymentAction } from "../_actions/record-payment.action";

const formSchema = z
  .object({
    paidAt: z.string().min(1, "Informe a data."),
    principalCents: z.bigint().nonnegative(),
    interestCents: z.bigint().nonnegative(),
    isExtra: z.boolean(),
  })
  .refine(({ principalCents, interestCents }) => principalCents + interestCents > 0n, {
    message: "Pagamento deve ser maior que zero.",
  });

type FormValues = z.infer<typeof formSchema>;

interface Props {
  debtId: string;
  defaultPaidAt: string;
  defaults: { amountCents: string; principalCents: string; interestCents: string } | null;
  currentBalanceFormatted: string;
}

export function RecordPaymentForm({
  debtId,
  defaultPaidAt,
  defaults,
  currentBalanceFormatted,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const paidAtId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paidAt: defaultPaidAt,
      principalCents: defaults ? BigInt(defaults.principalCents) : 0n,
      interestCents: defaults ? BigInt(defaults.interestCents) : 0n,
      isExtra: false,
    },
  });

  const principal = useWatch({ control: form.control, name: "principalCents" }) ?? 0n;
  const interest = useWatch({ control: form.control, name: "interestCents" }) ?? 0n;
  const isExtra = useWatch({ control: form.control, name: "isExtra" }) ?? false;
  const totalCents = (principal as bigint) + (interest as bigint);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const fd = new FormData();
    fd.set("debtId", debtId);
    fd.set("paidAt", values.paidAt);
    fd.set("principalCents", values.principalCents.toString());
    fd.set("interestCents", values.interestCents.toString());
    fd.set("amountCents", (values.principalCents + values.interestCents).toString());
    fd.set("isExtra", values.isExtra ? "true" : "false");
    startTransition(async () => {
      const r = await recordPaymentAction(fd);
      if (!r.ok) {
        setServerError(r.message);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("active") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("all") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.debts("paid_off") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSnapshot }),
        queryClient.invalidateQueries({ queryKey: ["timeline"] }),
      ]);
      router.push(`/app/dividas/${r.debtId}` as Route);
    });
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
            Dívida atual
          </span>
          <span className="text-[1.125rem] font-extrabold text-[color:var(--text-primary)]">
            {currentBalanceFormatted}
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <WizardField label="Data do pagamento" htmlFor={paidAtId}>
          <input
            id={paidAtId}
            type="date"
            {...form.register("paidAt")}
            className={wizardInputClass}
          />
        </WizardField>

        <MoneyInput
          control={form.control}
          name="principalCents"
          label="Parte do principal"
          helper="Valor abatido da dívida."
          required
        />

        <MoneyInput
          control={form.control}
          name="interestCents"
          label="Parte de juros"
          helper="Juros pagos nesse mês."
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]">
            Tipo de pagamento
          </span>
          <div className="grid grid-cols-2 gap-2">
            <WizardRadioCard
              title="Parcela normal"
              description="Pagamento agendado da dívida."
              active={!isExtra}
              onSelect={() => form.setValue("isExtra", false, { shouldDirty: true })}
            />
            <WizardRadioCard
              title="Pagamento extra"
              description="Amortização acima da parcela."
              active={isExtra}
              onSelect={() => form.setValue("isExtra", true, { shouldDirty: true })}
            />
          </div>
        </div>

        <div className="flex items-baseline justify-between border-t border-[color:var(--border-soft)] pt-3">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
            Total
          </span>
          <span className="text-[1.125rem] font-extrabold text-[color:var(--text-primary)]">
            {formatCentsForDisplay(totalCents as bigint)}
          </span>
        </div>
      </section>

      {form.formState.errors.root ? (
        <span role="alert" className="text-sm text-[color:var(--semantic-negative)]">
          {form.formState.errors.root.message}
        </span>
      ) : null}
      {serverError ? (
        <span role="alert" className="text-sm text-[color:var(--semantic-negative)]">
          {serverError}
        </span>
      ) : null}

      <Button type="submit" loading={pending}>
        Registrar pagamento
      </Button>
    </form>
  );
}

function formatCentsForDisplay(cents: bigint): string {
  const reais = Number(cents) / 100;
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
