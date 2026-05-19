"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/app/components/ui/button";

import { MoneyInput } from "../../../../_components/money-input";
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
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

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
      if (!r.ok) setServerError(r.message);
      // success -> action redirects
    });
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <p className="text-sm opacity-80">
        Saldo atual: <strong>{currentBalanceFormatted}</strong>
      </p>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Data do pagamento</span>
        <input
          type="date"
          {...form.register("paidAt")}
          className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-base outline-none focus:border-[color:var(--color-brand-500)] focus:ring-2 focus:ring-[color:var(--color-brand-500)]/30"
        />
      </label>

      <MoneyInput
        control={form.control}
        name="principalCents"
        label="Parte do principal"
        helper="Valor abatido do saldo devedor."
        required
      />
      <MoneyInput
        control={form.control}
        name="interestCents"
        label="Parte de juros"
        helper="Juros pagos neste mês."
      />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("isExtra")} />
        <span>É um pagamento extra (alem da parcela)</span>
      </label>

      <p className="text-xs opacity-70">
        Total: <strong>{formatCentsForDisplay(totalCents as bigint)}</strong>
      </p>

      {form.formState.errors.root ? (
        <span role="alert" className="text-sm text-[color:var(--color-negative)]">
          {form.formState.errors.root.message}
        </span>
      ) : null}
      {serverError ? (
        <span role="alert" className="text-sm text-[color:var(--color-negative)]">
          {serverError}
        </span>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Registrando..." : "Registrar pagamento"}
      </Button>
    </form>
  );
}

function formatCentsForDisplay(cents: bigint): string {
  const reais = Number(cents) / 100;
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
