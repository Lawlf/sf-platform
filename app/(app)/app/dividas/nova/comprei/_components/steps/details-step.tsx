"use client";

import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormWatch,
} from "react-hook-form";

import { Spinner } from "@/app/components/ui/spinner";
import { WizardField, wizardInputClass } from "../../../_components/wizard-field";
import { WizardMoneyField } from "../../../_components/wizard-money-field";
import { WizardRadioCard } from "../../../_components/wizard-radio-card";
import {
  listCashAssetsForPurchase,
  type CashAssetPayload,
} from "../../_actions/list-cash-assets.action";
import {
  listCreditCardsForPurchase,
  type CreditCardDebtPayload,
} from "../../_actions/list-credit-cards.action";
import type { NewPurchaseFormValues } from "../new-purchase-wizard.client";

function formatBRL(cents: bigint | null | undefined): string {
  if (cents === null || cents === undefined) return "R$ 0,00";
  const reais = Number(cents) / 100;
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface DetailsStepProps {
  control: Control<NewPurchaseFormValues>;
  register: UseFormRegister<NewPurchaseFormValues>;
  errors: FieldErrors<NewPurchaseFormValues>;
  watch: UseFormWatch<NewPurchaseFormValues>;
  onSelectCreditCardOption: (id: string | null) => void;
  onSelectCashOnboarding: (choice: "create" | "skip") => void;
}

export function DetailsStep({
  control,
  register,
  errors,
  watch,
  onSelectCreditCardOption,
  onSelectCashOnboarding,
}: DetailsStepProps) {
  const paymentMethod = watch("paymentMethod");
  const valueCents = watch("valueCents");
  const installments = watch("installments");
  const creditCardChoice = watch("creditCardChoice");
  const fromCashAssetId = watch("fromCashAssetId");
  const monthlyPaymentCents = watch("monthlyPaymentCents");
  const cashOnboarding = watch("cashOnboarding");

  const installmentsId = useId();
  const monthlyId = useId();
  const newCardLabelId = useId();
  const newCardLimitId = useId();
  const newCardClosingId = useId();
  const newCardDueId = useId();
  const cashAssetNameId = useId();
  const currentBalanceId = useId();
  const downPaymentId = useId();
  const financingTermId = useId();
  const financingRateId = useId();

  const { data: cashAssets, isLoading: loadingCash } = useQuery<CashAssetPayload[]>({
    queryKey: ["comprei", "cash-assets"],
    queryFn: () => listCashAssetsForPurchase(),
    enabled: paymentMethod === "cash",
    staleTime: 30_000,
  });

  const { data: creditCards, isLoading: loadingCards } = useQuery<CreditCardDebtPayload[]>({
    queryKey: ["comprei", "credit-cards"],
    queryFn: () => listCreditCardsForPurchase(),
    enabled: paymentMethod === "credit_card",
    staleTime: 30_000,
  });

  if (paymentMethod === "cash") {
    const hasCash = (cashAssets ?? []).length > 0;
    return (
      <>
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 text-[0.8125rem] text-[color:var(--text-primary)]">
          Tudo certo. Vamos registrar essa compra.
        </div>

        {loadingCash ? (
          <div className="mt-3 flex justify-center py-4"><Spinner size={20} /></div>
        ) : hasCash ? (
          <div className="mt-3">
            <div className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-primary)] opacity-80">
              De qual conta saiu?
            </div>
            <div className="flex flex-col gap-2">
              {(cashAssets ?? []).map((asset) => {
                const active = fromCashAssetId === asset.id;
                return (
                  <WizardRadioCard
                    key={asset.id}
                    title={asset.label}
                    description={`Saldo atual: ${asset.currentValue.formatted}`}
                    active={active}
                    onSelect={() => onSelectCreditCardOption(asset.id)}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <div className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-primary)] opacity-80">
              Quer cadastrar sua conta agora?
            </div>
            <div className="flex flex-col gap-2">
              <WizardRadioCard
                title="Cadastrar minha conta agora"
                description="Acompanhe seu saldo daqui pra frente."
                active={cashOnboarding === "create"}
                onSelect={() => onSelectCashOnboarding("create")}
              />
              {cashOnboarding === "create" ? (
                <div className="flex flex-col gap-2 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-3">
                  <WizardField
                    label="Como você chama essa conta?"
                    htmlFor={cashAssetNameId}
                    error={errors.cashAssetName?.message}
                  >
                    <input
                      id={cashAssetNameId}
                      {...register("cashAssetName")}
                      placeholder="Conta corrente"
                      className={wizardInputClass}
                    />
                  </WizardField>
                  <WizardField
                    label="Quanto tem na conta hoje?"
                    htmlFor={currentBalanceId}
                    error={errors.currentBalanceCents?.message}
                  >
                    <WizardMoneyField
                      control={control}
                      name="currentBalanceCents"
                      id={currentBalanceId}
                      placeholder="R$ 0,00"
                    />
                  </WizardField>
                  <div className="text-[0.6875rem] leading-[1.4] text-[color:var(--text-primary)] opacity-65">
                    A gente vai descontar essa compra automaticamente.
                  </div>
                </div>
              ) : null}
              <WizardRadioCard
                title="Pular por agora"
                description="A gente registra a compra sem mexer no saldo."
                active={cashOnboarding === "skip"}
                onSelect={() => onSelectCashOnboarding("skip")}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  if (paymentMethod === "credit_card") {
    const cards = creditCards ?? [];
    const safeInstallments =
      typeof installments === "number" && installments >= 1 ? installments : 1;
    const perInstallment =
      typeof valueCents === "bigint" && valueCents > 0n
        ? valueCents / BigInt(Math.max(1, Math.floor(safeInstallments)))
        : null;

    const showNewCardForm = creditCardChoice === "new" || (!loadingCards && cards.length === 0);
    return (
      <>
        <WizardField
          label="Em quantas vezes?"
          htmlFor={installmentsId}
          error={errors.installments?.message}
        >
          <input
            id={installmentsId}
            type="number"
            inputMode="numeric"
            min={1}
            max={60}
            {...register("installments", { valueAsNumber: true })}
            className={wizardInputClass}
          />
        </WizardField>

        {perInstallment !== null ? (
          <div className="mb-3 rounded-2xl bg-[linear-gradient(135deg,#ef7a1a,#f28e25)] p-4 text-white shadow-[0_8px_24px_rgba(239,122,26,0.3)]">
            <div className="text-[0.625rem] font-semibold uppercase tracking-[0.6px] opacity-90">
              Valor da parcela
            </div>
            <div className="mt-1 text-[1.375rem] font-extrabold leading-tight">
              {formatBRL(perInstallment)}
            </div>
            <div className="mt-0.5 text-[0.6875rem] opacity-85">
              Estimativa sem juros. Com juros, ajuste depois.
            </div>
          </div>
        ) : null}

        {loadingCards ? (
          <div className="flex justify-center py-4"><Spinner size={20} /></div>
        ) : cards.length > 0 ? (
          <WizardField label="Em qual cartão?">
            <div className="flex flex-col gap-2">
              {cards.map((card) => {
                const active = creditCardChoice === card.id;
                return (
                  <WizardRadioCard
                    key={card.id}
                    title={card.label}
                    description="Cartão já cadastrado."
                    active={active}
                    onSelect={() => onSelectCreditCardOption(card.id)}
                  />
                );
              })}
              <WizardRadioCard
                title="Cadastrar novo"
                description="Não está na lista."
                active={creditCardChoice === "new"}
                onSelect={() => onSelectCreditCardOption("new")}
              />
            </div>
          </WizardField>
        ) : null}

        {showNewCardForm ? (
          <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-3">
            <div className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
              Novo cartão
            </div>
            <WizardField label="Nome do cartão" htmlFor={newCardLabelId}>
              <input
                id={newCardLabelId}
                {...register("newCardLabel")}
                placeholder="Ex: Nubank Roxinho"
                className={wizardInputClass}
              />
            </WizardField>
            <WizardField label="Limite total" htmlFor={newCardLimitId}>
              <WizardMoneyField
                control={control}
                name="newCardLimitCents"
                id={newCardLimitId}
                placeholder="R$ 0,00"
              />
            </WizardField>
            <div className="grid grid-cols-2 gap-2">
              <WizardField label="Dia de fechamento" htmlFor={newCardClosingId}>
                <input
                  id={newCardClosingId}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  {...register("newCardClosingDay", { valueAsNumber: true })}
                  className={wizardInputClass}
                />
              </WizardField>
              <WizardField label="Dia de vencimento" htmlFor={newCardDueId}>
                <input
                  id={newCardDueId}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  {...register("newCardDueDay", { valueAsNumber: true })}
                  className={wizardInputClass}
                />
              </WizardField>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  if (paymentMethod === "financing") {
    const downPaymentCents = watch("downPaymentCents");
    const principal =
      typeof valueCents === "bigint" && typeof downPaymentCents === "bigint"
        ? valueCents - downPaymentCents
        : null;
    return (
      <>
        <WizardField
          label="Entrada (opcional)"
          htmlFor={downPaymentId}
          error={errors.downPaymentCents?.message}
        >
          <WizardMoneyField
            control={control}
            name="downPaymentCents"
            id={downPaymentId}
            placeholder="R$ 0,00"
          />
        </WizardField>

        <WizardField
          label="Em quantas parcelas?"
          htmlFor={financingTermId}
          error={errors.financingTermMonths?.message}
        >
          <input
            id={financingTermId}
            type="number"
            inputMode="numeric"
            min={1}
            max={420}
            {...register("financingTermMonths", { valueAsNumber: true })}
            className={wizardInputClass}
          />
        </WizardField>

        <WizardField
          label="Taxa anual"
          htmlFor={financingRateId}
          error={errors.financingAnnualRatePct?.message}
        >
          <input
            id={financingRateId}
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.1}
            {...register("financingAnnualRatePct", { valueAsNumber: true })}
            placeholder="Ex: 10.5"
            className={wizardInputClass}
          />
        </WizardField>

        {principal !== null && principal > 0n ? (
          <div className="mb-3 rounded-2xl bg-[linear-gradient(135deg,#ef7a1a,#f28e25)] p-4 text-white shadow-[0_8px_24px_rgba(239,122,26,0.3)]">
            <div className="text-[0.625rem] font-semibold uppercase tracking-[0.6px] opacity-90">
              Valor financiado
            </div>
            <div className="mt-1 text-[1.375rem] font-extrabold leading-tight">
              {formatBRL(principal)}
            </div>
            <div className="mt-0.5 text-[0.6875rem] opacity-85">
              Valor da compra menos a entrada. Sistema PRICE (parcela fixa).
            </div>
          </div>
        ) : null}
      </>
    );
  }

  // loan
  const safeInstallments = typeof installments === "number" && installments >= 1 ? installments : 1;
  const total =
    typeof monthlyPaymentCents === "bigint" && monthlyPaymentCents > 0n
      ? monthlyPaymentCents * BigInt(Math.max(1, Math.floor(safeInstallments)))
      : null;
  const interest = total !== null && typeof valueCents === "bigint" ? total - valueCents : null;

  return (
    <>
      <WizardField
        label="Em quantas vezes?"
        htmlFor={installmentsId}
        error={errors.installments?.message}
      >
        <input
          id={installmentsId}
          type="number"
          inputMode="numeric"
          min={1}
          max={360}
          {...register("installments", { valueAsNumber: true })}
          className={wizardInputClass}
        />
      </WizardField>

      <WizardField
        label="Quanto paga por mês?"
        htmlFor={monthlyId}
        error={errors.monthlyPaymentCents?.message}
      >
        <WizardMoneyField
          control={control}
          name="monthlyPaymentCents"
          id={monthlyId}
          placeholder="R$ 0,00"
        />
      </WizardField>

      {total !== null ? (
        <div className="mb-3 rounded-2xl bg-[linear-gradient(135deg,#ef7a1a,#f28e25)] p-4 text-white shadow-[0_8px_24px_rgba(239,122,26,0.3)]">
          <div className="text-[0.625rem] font-semibold uppercase tracking-[0.6px] opacity-90">
            Total pago no fim
          </div>
          <div className="mt-1 text-[1.375rem] font-extrabold leading-tight">{formatBRL(total)}</div>
          {interest !== null ? (
            <div className="mt-0.5 text-[0.6875rem] opacity-85">
              {interest > 0n ? `Juros estimados: ${formatBRL(interest)}` : "Sem juros estimados."}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
