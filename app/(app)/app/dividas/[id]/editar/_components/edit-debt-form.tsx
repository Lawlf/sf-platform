"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
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
import type { DebtKind } from "@/domain/entities/debt.entity";
import type { Currency } from "@/domain/value-objects/money.vo";

import { MoneyInput } from "../../../../_components/money-input";
import { queryKeys } from "../../../../_lib/query-keys";
import { WizardField, wizardInputClass } from "../../../nova/_components/wizard-field";
import { updateDebtAction } from "../../_actions/update-debt.action";

const formSchema = z.object({
  label: z.string().min(1, "Informe um rótulo.").max(120),
  notes: z.string().max(1000).nullable(),
  expectedEndDate: z.string().nullable(),
  // Kind-specific (optional; only sent when present per kind)
  currentBalanceCents: z.bigint().nonnegative().nullable(),
  annualRatePct: z.number().min(0).max(1000).nullable(),
  monthlyInstallmentCents: z.bigint().nonnegative().nullable(),
  monthlyInsuranceCents: z.bigint().nonnegative().nullable(),
  monthlyAdminFeeCents: z.bigint().nonnegative().nullable(),
  creditLimitCents: z.bigint().nonnegative().nullable(),
  currentStatementCents: z.bigint().nonnegative().nullable(),
  statementDay: z.number().int().min(1).max(31).nullable(),
  dueDay: z.number().int().min(1).max(31).nullable(),
  revolvingBalanceCents: z.bigint().nonnegative().nullable(),
  revolvingMonthlyRatePct: z.number().min(0).max(1000).nullable(),
  bankName: z.string().max(120).nullable(),
  monthlyRatePct: z.number().min(0).max(1000).nullable(),
  recurringAmountCents: z.bigint().nonnegative().nullable(),
  recurringFrequency: z.enum(["monthly", "weekly"]).nullable(),
  expenseCategory: z.string().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  debtId: string;
  kind: DebtKind;
  currency: Currency;
  categories: ReadonlyArray<{ key: string; label: string }>;
  defaults: {
    label: string;
    notes: string | null;
    expectedEndDate: string | null;
    currentBalanceCents: string | null;
    annualRatePct: number | null;
    monthlyInstallmentCents: string | null;
    monthlyInsuranceCents: string | null;
    monthlyAdminFeeCents: string | null;
    creditLimitCents: string | null;
    currentStatementCents: string | null;
    statementDay: number | null;
    dueDay: number | null;
    revolvingBalanceCents: string | null;
    revolvingMonthlyRatePct: number | null;
    bankName: string | null;
    monthlyRatePct: number | null;
    recurringAmountCents: string | null;
    recurringFrequency: "monthly" | "weekly" | null;
    expenseCategory: string | null;
  };
}

export function EditDebtForm({ debtId, kind, currency, categories, defaults }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const labelId = useId();
  const notesId = useId();
  const endDateId = useId();
  const rateId = useId();
  const bankId = useId();
  const statementDayId = useId();
  const dueDayId = useId();
  const revolvingRateId = useId();
  const overdraftRateId = useId();
  const frequencyId = useId();
  const categoryId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: defaults.label,
      notes: defaults.notes,
      expectedEndDate: defaults.expectedEndDate,
      currentBalanceCents: defaults.currentBalanceCents
        ? BigInt(defaults.currentBalanceCents)
        : null,
      annualRatePct: defaults.annualRatePct,
      monthlyInstallmentCents: defaults.monthlyInstallmentCents
        ? BigInt(defaults.monthlyInstallmentCents)
        : null,
      monthlyInsuranceCents: defaults.monthlyInsuranceCents
        ? BigInt(defaults.monthlyInsuranceCents)
        : null,
      monthlyAdminFeeCents: defaults.monthlyAdminFeeCents
        ? BigInt(defaults.monthlyAdminFeeCents)
        : null,
      creditLimitCents: defaults.creditLimitCents ? BigInt(defaults.creditLimitCents) : null,
      currentStatementCents: defaults.currentStatementCents
        ? BigInt(defaults.currentStatementCents)
        : null,
      statementDay: defaults.statementDay,
      dueDay: defaults.dueDay,
      revolvingBalanceCents: defaults.revolvingBalanceCents
        ? BigInt(defaults.revolvingBalanceCents)
        : null,
      revolvingMonthlyRatePct: defaults.revolvingMonthlyRatePct,
      bankName: defaults.bankName,
      monthlyRatePct: defaults.monthlyRatePct,
      recurringAmountCents: defaults.recurringAmountCents
        ? BigInt(defaults.recurringAmountCents)
        : null,
      recurringFrequency: defaults.recurringFrequency,
      expenseCategory: defaults.expenseCategory,
    },
  });

  // Cartão tem "Saldo devedor atual" e "Fatura atual", que para quem paga a
  // fatura inteira (sem rotativo) são o mesmo número. Enquanto estiverem em
  // sincronia, editar o saldo espelha na fatura, evitando digitar 2x. Se a pessoa
  // deixar os dois diferentes (tem rotativo), o link quebra e cada um fica solto.
  const initBalance = defaults.currentBalanceCents ? BigInt(defaults.currentBalanceCents) : 0n;
  const initStatement = defaults.currentStatementCents ? BigInt(defaults.currentStatementCents) : 0n;
  const statementCustomizedRef = useRef(initStatement > 0n && initStatement !== initBalance);

  function handleBalanceChange(nextBalance: bigint) {
    if (kind !== "credit_card" || statementCustomizedRef.current) return;
    form.setValue("currentStatementCents", nextBalance, { shouldValidate: true });
  }

  function handleStatementChange(nextStatement: bigint) {
    if (kind !== "credit_card") return;
    const balance = (form.getValues("currentBalanceCents") as bigint | null) ?? 0n;
    statementCustomizedRef.current = nextStatement !== balance;
  }

  async function onSubmit(v: FormValues) {
    setServerError(null);
    const fd = new FormData();
    fd.set("debtId", debtId);
    fd.set("label", v.label);
    fd.set("notes", v.notes ?? "");
    fd.set("expectedEndDate", v.expectedEndDate ?? "");

    if (kind === "financing" || kind === "personal_loan") {
      if (v.currentBalanceCents != null) {
        fd.set("currentBalanceCents", v.currentBalanceCents.toString());
      }
      if (v.annualRatePct != null) {
        fd.set("annualRatePct", String(v.annualRatePct));
      }
    }
    if (kind === "personal_loan") {
      if (v.monthlyInstallmentCents != null) {
        fd.set("monthlyInstallmentCents", v.monthlyInstallmentCents.toString());
      }
      if (v.dueDay != null) fd.set("dueDay", String(v.dueDay));
    }
    if (kind === "financing") {
      fd.set("monthlyInsuranceCents", v.monthlyInsuranceCents?.toString() ?? "");
      fd.set("monthlyAdminFeeCents", v.monthlyAdminFeeCents?.toString() ?? "");
    }
    if (kind === "credit_card") {
      if (v.currentBalanceCents != null) {
        fd.set("currentBalanceCents", v.currentBalanceCents.toString());
      }
      if (v.creditLimitCents != null) fd.set("creditLimitCents", v.creditLimitCents.toString());
      if (v.currentStatementCents != null) {
        fd.set("currentStatementCents", v.currentStatementCents.toString());
      }
      if (v.statementDay != null) fd.set("statementDay", String(v.statementDay));
      if (v.dueDay != null) fd.set("dueDay", String(v.dueDay));
      fd.set("revolvingBalanceCents", v.revolvingBalanceCents?.toString() ?? "");
      fd.set(
        "revolvingMonthlyRatePct",
        v.revolvingMonthlyRatePct != null ? String(v.revolvingMonthlyRatePct) : "",
      );
    }
    if (kind === "overdraft") {
      if (v.currentBalanceCents != null) {
        fd.set("currentBalanceCents", v.currentBalanceCents.toString());
      }
      if (v.bankName) fd.set("bankName", v.bankName);
      if (v.monthlyRatePct != null) fd.set("monthlyRatePct", String(v.monthlyRatePct));
    }
    if (kind === "recurring") {
      if (v.recurringAmountCents != null) {
        fd.set("recurringAmountCents", v.recurringAmountCents.toString());
      }
      if (v.recurringFrequency) fd.set("recurringFrequency", v.recurringFrequency);
      if (v.expenseCategory) fd.set("expenseCategory", v.expenseCategory);
      if (v.dueDay != null) fd.set("dueDay", String(v.dueDay));
    }

    startTransition(async () => {
      const r = await updateDebtAction(fd);
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
      router.push(`/app/dividas/${r.data.debtId}` as Route);
    });
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <section className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <WizardField label="Nome" htmlFor={labelId} error={form.formState.errors.label?.message}>
          <input id={labelId} {...form.register("label")} className={wizardInputClass} />
        </WizardField>

        <WizardField label="Anotações" htmlFor={notesId}>
          <textarea
            id={notesId}
            rows={3}
            {...form.register("notes")}
            className={wizardInputClass}
          />
        </WizardField>

        <WizardField label="Data prevista de quitação" htmlFor={endDateId}>
          <input
            id={endDateId}
            type="date"
            {...form.register("expectedEndDate")}
            className={wizardInputClass}
          />
        </WizardField>
      </section>

      {kind !== "recurring" ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
          <MoneyInput
            control={form.control}
            name="currentBalanceCents"
            label="Quanto falta pagar"
            helper="Valor que ainda falta pagar."
            currency={currency}
            onValueChange={handleBalanceChange}
          />
        </section>
      ) : null}

      {(kind === "financing" || kind === "personal_loan") && (
        <section className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
          <WizardField label="Taxa por ano" htmlFor={rateId}>
            <input
              id={rateId}
              type="number"
              step="0.01"
              min={0}
              max={1000}
              {...form.register("annualRatePct", { valueAsNumber: true })}
              className={wizardInputClass}
            />
          </WizardField>
          {kind === "personal_loan" ? (
            <>
              <MoneyInput
                control={form.control}
                name="monthlyInstallmentCents"
                label="Parcela mensal"
                currency={currency}
              />
              <WizardField label="Dia do vencimento (opcional)" htmlFor={dueDayId}>
                <input
                  id={dueDayId}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  placeholder="Ex: 10"
                  {...form.register("dueDay", {
                    setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                  })}
                  className={wizardInputClass}
                />
              </WizardField>
            </>
          ) : null}
          {kind === "financing" ? (
            <>
              <MoneyInput
                control={form.control}
                name="monthlyInsuranceCents"
                label="Seguro mensal"
                currency={currency}
              />
              <MoneyInput
                control={form.control}
                name="monthlyAdminFeeCents"
                label="Taxa administrativa mensal"
                currency={currency}
              />
            </>
          ) : null}
        </section>
      )}

      {kind === "credit_card" ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
          <MoneyInput
            control={form.control}
            name="creditLimitCents"
            label="Limite do cartão"
            currency={currency}
          />
          <MoneyInput
            control={form.control}
            name="currentStatementCents"
            label="Fatura atual"
            helper="Para quem paga a fatura toda, é tudo o que falta. Tem rotativo? Ponha só o deste mês."
            currency={currency}
            onValueChange={handleStatementChange}
          />
          <div className="grid grid-cols-2 gap-2">
            <WizardField label="Dia de fechamento" htmlFor={statementDayId}>
              <input
                id={statementDayId}
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                {...form.register("statementDay", { valueAsNumber: true })}
                className={wizardInputClass}
              />
            </WizardField>
            <WizardField label="Dia de vencimento" htmlFor={dueDayId}>
              <input
                id={dueDayId}
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                {...form.register("dueDay", { valueAsNumber: true })}
                className={wizardInputClass}
              />
            </WizardField>
          </div>
          <MoneyInput
            control={form.control}
            name="revolvingBalanceCents"
            label="Quanto rolou de fatura"
            helper="Faturas anteriores que ficaram pra trás."
            currency={currency}
          />
          <WizardField label="Juros do rotativo por mês" htmlFor={revolvingRateId}>
            <input
              id={revolvingRateId}
              type="number"
              step="0.01"
              min={0}
              max={1000}
              {...form.register("revolvingMonthlyRatePct", { valueAsNumber: true })}
              className={wizardInputClass}
            />
          </WizardField>
        </section>
      ) : null}

      {kind === "overdraft" ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
          <WizardField label="Banco" htmlFor={bankId}>
            <input id={bankId} {...form.register("bankName")} className={wizardInputClass} />
          </WizardField>
          <WizardField label="Taxa por mês" htmlFor={overdraftRateId}>
            <input
              id={overdraftRateId}
              type="number"
              step="0.01"
              min={0}
              max={1000}
              {...form.register("monthlyRatePct", { valueAsNumber: true })}
              className={wizardInputClass}
            />
          </WizardField>
        </section>
      ) : null}

      {kind === "recurring" ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
          <WizardField label="Categoria" htmlFor={categoryId}>
            <Controller
              control={form.control}
              name="expenseCategory"
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id={categoryId} className={`${wizardInputClass} h-auto w-full`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </WizardField>
          <MoneyInput
            control={form.control}
            name="recurringAmountCents"
            label="Valor por período"
            currency={currency}
          />
          <WizardField label="Frequência" htmlFor={frequencyId}>
            <Controller
              control={form.control}
              name="recurringFrequency"
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id={frequencyId} className={`${wizardInputClass} h-auto w-full`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </WizardField>
          <WizardField
            label="Dia do pagamento (opcional)"
            htmlFor={dueDayId}
            helper="Dia do mês em que o pagamento cai. Usado pra avisar no calendário."
          >
            <input
              id={dueDayId}
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              {...form.register("dueDay", {
                setValueAs: (v) => {
                  if (v === "" || v === null || v === undefined) return null;
                  const n = Number(v);
                  return Number.isFinite(n) ? n : null;
                },
              })}
              className={wizardInputClass}
            />
          </WizardField>
        </section>
      ) : null}

      {serverError ? (
        <span role="alert" className="text-sm text-[color:var(--semantic-negative)]">
          {serverError}
        </span>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>
          Salvar alterações
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`/app/dividas/${debtId}` as Route)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
