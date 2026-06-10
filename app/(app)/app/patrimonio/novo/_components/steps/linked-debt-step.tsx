"use client";

import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import { Controller, useFieldArray } from "react-hook-form";

import { Spinner } from "@/app/components/ui/spinner";

import { WizardField, wizardInputClass } from "../../../../dividas/nova/_components/wizard-field";
import { WizardMoneyField } from "../../../../dividas/nova/_components/wizard-money-field";
import { WizardRadioCard } from "../../../../dividas/nova/_components/wizard-radio-card";
import { WizardShell, type WizardStep } from "../../../../dividas/nova/_components/wizard-shell";
import {
  listActiveDebtsForLinking,
  type ActiveDebtPayload,
} from "../../_actions/list-active-debts.action";
import type { AssetWizardForm, NewDebtKind } from "../asset-wizard.client";

const DEBT_KIND_LABEL: Record<string, string> = {
  financing: "Financiamento",
  personal_loan: "Empréstimo ou crediário",
  credit_card: "Cartão de crédito",
  overdraft: "Cheque especial",
};

const NEW_DEBT_KIND_OPTIONS: ReadonlyArray<{
  value: NewDebtKind;
  title: string;
  description: string;
}> = [
  {
    value: "financing",
    title: "Financiamento",
    description: "Carro, imóvel.",
  },
  {
    value: "personal_loan",
    title: "Empréstimo",
    description: "Pessoal ou consignado.",
  },
  {
    value: "credit_card",
    title: "Cartão parcelado",
    description: "Compra no cartão.",
  },
];

export interface LinkedDebtStepProps {
  form: AssetWizardForm;
  visualStep: WizardStep;
  onBack: () => void;
  onNext: () => void;
  nextIcon: React.ReactNode;
  totalSteps?: number;
}

export function LinkedDebtStep({
  form,
  visualStep,
  onBack,
  onNext,
  nextIcon,
  totalSteps,
}: LinkedDebtStepProps) {
  const choice = form.watch("linkedDebtChoice") ?? "unset";
  const newDebtKind = form.watch("newDebtKind");

  const labelInputId = useId();
  const principalInputId = useId();
  const installmentsInputId = useId();
  const rateInputId = useId();

  const { data: debts, isLoading } = useQuery<ActiveDebtPayload[]>({
    queryKey: ["active-debts"],
    queryFn: () => listActiveDebtsForLinking(),
    enabled: choice === "yes",
    staleTime: 30_000,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "allocations",
  });

  function handlePickNo() {
    // Limpa qualquer dado de dívida nova ou de alocações pré-selecionadas e avança.
    form.setValue("allocations", [], { shouldDirty: true });
    form.setValue("newDebtKind", undefined, { shouldDirty: true });
    form.setValue("linkedDebtChoice", "no", { shouldDirty: true });
    onNext();
  }

  function handlePickYes() {
    form.setValue("newDebtKind", undefined, { shouldDirty: true });
    form.setValue("linkedDebtChoice", "yes", { shouldDirty: true });
  }

  function handlePickNew() {
    form.setValue("allocations", [], { shouldDirty: true });
    form.setValue("linkedDebtChoice", "new", { shouldDirty: true });
  }

  function isDebtSelected(debtId: string): boolean {
    return fields.some((f) => f.debtId === debtId);
  }

  function toggleDebt(debt: ActiveDebtPayload) {
    const idx = fields.findIndex((f) => f.debtId === debt.id);
    if (idx >= 0) {
      remove(idx);
      return;
    }
    append({
      debtId: debt.id,
      allocationCents: BigInt(debt.currentBalance.cents),
    });
  }

  function indexForDebt(debtId: string): number {
    return fields.findIndex((f) => f.debtId === debtId);
  }

  function newDebtIsValid(): boolean {
    if (!newDebtKind) return false;
    const label = (form.getValues("newDebtLabel") ?? "").trim();
    if (label.length === 0) return false;
    const principal = form.getValues("newDebtPrincipalCents") ?? null;
    if (principal === null || principal <= 0n) return false;
    const installments = Number.parseInt(form.getValues("newDebtInstallments") ?? "", 10);
    if (!Number.isFinite(installments) || installments < 1) return false;
    const rate = Number.parseFloat(
      (form.getValues("newDebtMonthlyRatePct") ?? "0").replace(",", "."),
    );
    if (!Number.isFinite(rate) || rate < 0) return false;
    return true;
  }

  const showPrimary =
    choice === "yes" || (choice === "new" && Boolean(newDebtKind) && newDebtIsValid());

  return (
    <WizardShell
      currentStep={visualStep}
      title="Esse bem tem uma dívida atrelada?"
      description="Por exemplo: comprou um carro financiado ou um imóvel com financiamento. Você pode vincular agora ou depois."
      onBack={onBack}
      totalSteps={totalSteps}
      primary={
        showPrimary
          ? {
              label: "Próximo",
              onClick: onNext,
              icon: nextIcon,
            }
          : undefined
      }
    >
      <Controller
        control={form.control}
        name="linkedDebtChoice"
        render={({ field }) => (
          <WizardField label="Vincular dívida">
            <div className="grid grid-cols-3 gap-2">
              <WizardRadioCard
                title="Não tem"
                description="Sem dívida vinculada."
                active={field.value === "no"}
                onSelect={handlePickNo}
              />
              <WizardRadioCard
                title="Já cadastrei"
                description="Escolher da lista."
                active={field.value === "yes"}
                onSelect={handlePickYes}
              />
              <WizardRadioCard
                title="Cadastrar nova"
                description="Criar agora aqui."
                active={field.value === "new"}
                onSelect={handlePickNew}
              />
            </div>
          </WizardField>
        )}
      />

      {choice === "yes" ? (
        <div className="flex flex-col gap-2">
          {isLoading ? (
            <div className="flex justify-center py-4"><Spinner size={20} /></div>
          ) : !debts || debts.length === 0 ? (
            <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 py-3 text-[0.8125rem] text-[color:var(--text-primary)] opacity-75">
              Nenhuma dívida ativa encontrada. Escolha &quot;Cadastrar nova&quot; acima ou volte
              depois.
            </div>
          ) : (
            debts.map((debt) => {
              const selected = isDebtSelected(debt.id);
              const idx = indexForDebt(debt.id);
              return (
                <div
                  key={debt.id}
                  className={`rounded-xl border-[1.5px] p-3 transition-colors ${
                    selected
                      ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)]/12"
                      : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleDebt(debt)}
                    aria-pressed={selected}
                    className="flex w-full items-start justify-between gap-2 text-left focus-visible:outline-none"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
                        {debt.label}
                      </div>
                      <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-primary)] opacity-65">
                        {DEBT_KIND_LABEL[debt.kind] ?? debt.kind} · {debt.currentBalance.formatted}
                      </div>
                    </div>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] text-[0.6875rem] font-bold ${
                        selected
                          ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-500)] text-white"
                          : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)]"
                      }`}
                      aria-hidden
                    >
                      {selected ? "✓" : ""}
                    </span>
                  </button>

                  {selected && idx >= 0 && debts.length > 1 ? (
                    <div className="mt-3">
                      <label
                        htmlFor={`alloc-${debt.id}`}
                        className="mb-1 block text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-primary)] opacity-80"
                      >
                        Quanto dessa dívida é por causa deste bem?
                      </label>
                      <WizardMoneyField
                        control={form.control}
                        name={`allocations.${idx}.allocationCents`}
                        id={`alloc-${debt.id}`}
                      />
                    </div>
                  ) : selected && idx >= 0 ? (
                    <div className="mt-2 text-[0.6875rem] text-[color:var(--text-primary)] opacity-65">
                      Vinculada por inteiro a este bem.
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}

      {choice === "new" ? (
        <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-3">
          <div className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">Nova dívida</div>
          <div className="text-[0.6875rem] text-[color:var(--text-primary)] opacity-65">
            Vamos cadastrar a dívida e já vincular a este bem.
          </div>

          <Controller
            control={form.control}
            name="newDebtKind"
            render={({ field }) => (
              <WizardField label="Tipo da dívida">
                <div className="grid grid-cols-3 gap-2">
                  {NEW_DEBT_KIND_OPTIONS.map((opt) => (
                    <WizardRadioCard
                      key={opt.value}
                      title={opt.title}
                      description={opt.description}
                      active={field.value === opt.value}
                      onSelect={() => field.onChange(opt.value)}
                    />
                  ))}
                </div>
              </WizardField>
            )}
          />

          {newDebtKind ? (
            <>
              <WizardField label="Nome da dívida" htmlFor={labelInputId}>
                <input
                  id={labelInputId}
                  {...form.register("newDebtLabel")}
                  placeholder="Ex: Financiamento do carro"
                  className={wizardInputClass}
                />
              </WizardField>

              <WizardField label="Valor total" htmlFor={principalInputId}>
                <WizardMoneyField
                  control={form.control}
                  name="newDebtPrincipalCents"
                  id={principalInputId}
                  placeholder="R$ 0,00"
                />
              </WizardField>

              <WizardField label="Número de parcelas" htmlFor={installmentsInputId}>
                <input
                  id={installmentsInputId}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={420}
                  {...form.register("newDebtInstallments")}
                  className={wizardInputClass}
                />
              </WizardField>

              <WizardField
                label="Taxa mensal"
                htmlFor={rateInputId}
                helper="Ex: 1,5 para 1,5% ao mês. Use 0 se for sem juros."
              >
                <div className="relative">
                  <input
                    id={rateInputId}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0,00"
                    {...form.register("newDebtMonthlyRatePct")}
                    className={`${wizardInputClass} pr-10`}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.875rem] font-semibold text-[color:var(--text-muted)]"
                  >
                    %
                  </span>
                </div>
              </WizardField>
            </>
          ) : null}
        </div>
      ) : null}
    </WizardShell>
  );
}
