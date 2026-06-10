"use client";

import type { UseFormReturn } from "react-hook-form";

import { Spinner } from "@/app/components/ui/spinner";

import { type CashAssetForLoanPayload } from "../../_actions/list-cash-assets-for-loan.action";
import { WizardField, wizardInputClass } from "../../_components/wizard-field";
import { WizardMoneyField } from "../../_components/wizard-money-field";
import { WizardRadioCard } from "../../_components/wizard-radio-card";

type CashTarget = "existing" | "new" | "spent";

interface Props {
  cashInflowFieldId: string;
  newCashNameId: string;
  newCashBalanceId: string;
  loadingCashAssets: boolean;
  cashAssets: CashAssetForLoanPayload[] | undefined;
  cashTarget: CashTarget | null;
  existingCashAssetId: string | null;
  serverError: string | null;
  newCashAssetName: string | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  onTargetChange: (target: CashTarget, assetId?: string) => void;
}

export function validateCashInflowStep(input: {
  cashTarget: CashTarget | null;
  existingCashAssetId: string | null;
  newCashAssetName: string | null | undefined;
}): string | null {
  if (input.cashTarget === null) return "Escolha uma opção para o dinheiro recebido.";
  if (input.cashTarget === "existing" && !input.existingCashAssetId) {
    return "Escolha a conta onde o dinheiro caiu.";
  }
  if (input.cashTarget === "new" && (input.newCashAssetName ?? "").trim().length === 0) {
    return "Informe o nome da conta.";
  }
  return null;
}

export function canAdvanceCashInflowStep(input: {
  cashTarget: CashTarget | null;
  existingCashAssetId: string | null;
  newCashAssetName: string | null | undefined;
}): boolean {
  if (input.cashTarget === null) return false;
  if (input.cashTarget === "spent") return true;
  if (input.cashTarget === "existing") return !!input.existingCashAssetId;
  if (input.cashTarget === "new") return (input.newCashAssetName ?? "").trim().length > 0;
  return false;
}

export function CashInflowStep({
  cashInflowFieldId,
  newCashNameId,
  newCashBalanceId,
  loadingCashAssets,
  cashAssets,
  cashTarget,
  existingCashAssetId,
  serverError,
  form,
  onTargetChange,
}: Props) {
  const hasAssets = (cashAssets ?? []).length > 0;
  return (
    <>
      {loadingCashAssets ? (
        <div className="flex justify-center py-4"><Spinner size={20} /></div>
      ) : hasAssets ? (
        <>
          <WizardField label="Escolha uma opção" htmlFor={cashInflowFieldId}>
            <div className="flex flex-col gap-2">
              {(cashAssets ?? []).map((asset) => (
                <WizardRadioCard
                  key={asset.id}
                  title={asset.label}
                  description={`Saldo atual: ${asset.currentValue.formatted}, vai somar o empréstimo`}
                  active={cashTarget === "existing" && existingCashAssetId === asset.id}
                  onSelect={() => onTargetChange("existing", asset.id)}
                />
              ))}
              <WizardRadioCard
                title="Sim, mas a conta não está cadastrada"
                description="Vamos criar agora."
                active={cashTarget === "new"}
                onSelect={() => onTargetChange("new")}
              />
              <WizardRadioCard
                title="Não, já usei o dinheiro todo"
                description="Sem mexer no saldo de nenhuma conta."
                active={cashTarget === "spent"}
                onSelect={() => onTargetChange("spent")}
              />
            </div>
          </WizardField>

          {cashTarget === "new" ? (
            <NewCashAccountFields
              newCashNameId={newCashNameId}
              newCashBalanceId={newCashBalanceId}
              form={form}
              {...(serverError ? { nameError: serverError } : {})}
            />
          ) : null}
        </>
      ) : (
        <WizardField label="Escolha uma opção" htmlFor={cashInflowFieldId}>
          <div className="flex flex-col gap-2">
            <WizardRadioCard
              title="Sim, quero cadastrar a conta agora"
              description="Nubank, Itaú, qualquer conta."
              active={cashTarget === "new"}
              onSelect={() => onTargetChange("new")}
            />
            <WizardRadioCard
              title="Não, já usei o dinheiro todo"
              description="Sem mexer no saldo de nenhuma conta."
              active={cashTarget === "spent"}
              onSelect={() => onTargetChange("spent")}
            />
          </div>
        </WizardField>
      )}

      {cashTarget === "new" && !hasAssets ? (
        <NewCashAccountFields
          newCashNameId={newCashNameId}
          newCashBalanceId={newCashBalanceId}
          form={form}
        />
      ) : null}

      {serverError && cashTarget !== "new" ? (
        <div
          role="alert"
          className="rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-3 py-2 text-[0.8125rem] text-[color:var(--semantic-negative)]"
        >
          {serverError}
        </div>
      ) : null}
    </>
  );
}

interface NewCashFieldsProps {
  newCashNameId: string;
  newCashBalanceId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  nameError?: string;
}

function NewCashAccountFields({
  newCashNameId,
  newCashBalanceId,
  form,
  nameError,
}: NewCashFieldsProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-3">
      <div className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">Nova conta</div>
      <WizardField label="Nome da conta" htmlFor={newCashNameId} error={nameError}>
        <input
          id={newCashNameId}
          {...form.register("newCashAssetName")}
          placeholder="Nubank, Itaú, Conta corrente..."
          className={wizardInputClass}
        />
      </WizardField>
      <WizardField
        label="Quanto tinha na conta ANTES do empréstimo cair?"
        htmlFor={newCashBalanceId}
        helper="A gente vai somar o empréstimo recebido aqui."
      >
        <WizardMoneyField
          control={form.control}
          name="newCashAssetCurrentBalanceCents"
          id={newCashBalanceId}
          placeholder="R$ 0,00"
        />
      </WizardField>
    </div>
  );
}
