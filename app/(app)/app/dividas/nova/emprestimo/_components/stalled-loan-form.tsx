"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { CURRENCIES, type Currency } from "@/domain/value-objects/money.vo";

import { createStalledLoanAction } from "../../../_actions/create-stalled-loan.action";
import { invalidateDebtCaches } from "../../../_lib/invalidate";
import { BankCombobox } from "../../_components/bank-combobox";
import { WizardField, wizardInputClass } from "../../_components/wizard-field";
import { WizardMoneyField } from "../../_components/wizard-money-field";
import { WizardShell } from "../../_components/wizard-shell";

const schema = z.object({
  label: z.string().min(1, "Informe um nome."),
  currency: z.enum(CURRENCIES),
  currentBalanceCents: z.bigint().positive("Informe quanto você deve."),
});

type Values = z.infer<typeof schema>;

export function StalledLoanForm({
  defaultCurrency = "BRL",
  onBack,
}: {
  defaultCurrency?: Currency;
  onBack: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [bank, setBank] = useState("");

  const labelId = useId();
  const bankId = useId();
  const balanceId = useId();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: "Empréstimo",
      currency: defaultCurrency,
      currentBalanceCents: 0n as unknown as bigint,
    },
  });
  const currency = form.watch("currency") ?? defaultCurrency;

  function handleSubmit() {
    setServerError(null);
    void form.trigger().then((valid) => {
      if (!valid) return;
      const v = form.getValues();
      startTransition(async () => {
        const r = await createStalledLoanAction({
          label: v.label,
          currency: v.currency,
          currentBalanceCents: v.currentBalanceCents.toString(),
        });
        if (!r.ok) {
          setServerError(r.message);
          return;
        }
        await invalidateDebtCaches(queryClient);
        router.push(`/app/dividas/${r.data.debtId}` as Route);
      });
    });
  }

  return (
    <WizardShell
      currentStep={1}
      hideSteps
      title="Dívida parada"
      description="A gente só guarda quanto você deve. Não entra na conta do mês até você definir como vai pagar."
      onBack={onBack}
      primary={{
        label: "Salvar dívida",
        onClick: handleSubmit,
        disabled: pending,
        loading: pending,
      }}
    >
      <WizardField label="Banco (opcional)" htmlFor={bankId}>
        <BankCombobox
          id={bankId}
          value={bank}
          onChange={(b) => {
            setBank(b);
            form.setValue("label", b.trim() ? `Empréstimo ${b.trim()}` : "Empréstimo", {
              shouldValidate: true,
            });
          }}
          placeholder="Ex: Nubank, Itaú, Caixa..."
        />
      </WizardField>

      <WizardField
        label="Nome da dívida"
        htmlFor={labelId}
        error={form.formState.errors.label?.message}
      >
        <input
          id={labelId}
          {...form.register("label")}
          placeholder="Ex: Empréstimo Nubank"
          className={wizardInputClass}
        />
      </WizardField>

      <WizardField
        label="Quanto você deve"
        htmlFor={balanceId}
        error={form.formState.errors.currentBalanceCents?.message}
      >
        <WizardMoneyField
          control={form.control}
          name="currentBalanceCents"
          id={balanceId}
          placeholder="R$ 0,00"
          currency={currency}
          onCurrencyChange={(c) => form.setValue("currency", c)}
        />
      </WizardField>

      {serverError ? (
        <div
          role="alert"
          className="mt-1 rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-3 py-2 text-[0.8125rem] text-[color:var(--semantic-negative)]"
        >
          {serverError}
        </div>
      ) : null}
    </WizardShell>
  );
}
