"use client";

import type { CashAssetPayload } from "../../_actions/list-cash-assets.action";
import type { CreditCardDebtPayload } from "../../_actions/list-credit-cards.action";
import type { NewPurchaseFormValues } from "../new-purchase-wizard.client";

function formatBRL(cents: bigint | null | undefined): string {
  if (cents === null || cents === undefined) return "R$ 0,00";
  const reais = Number(cents) / 100;
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Categorias que geram patrimônio. Espelha CATEGORY_CONFIG do action.
const ASSET_CATEGORIES = new Set<NewPurchaseFormValues["category"]>([
  "electronics",
  "furniture",
  "vehicle",
  "other",
]);

export interface ConfirmStepProps {
  values: NewPurchaseFormValues;
  cashAssets: CashAssetPayload[] | undefined;
  creditCards: CreditCardDebtPayload[] | undefined;
  serverError: string | null;
}

export function ConfirmStep({ values, cashAssets, creditCards, serverError }: ConfirmStepProps) {
  const purchaseName = values.name.trim() || "(sem nome)";
  const generatesAsset = ASSET_CATEGORIES.has(values.category);

  const lines: string[] = [];

  if (generatesAsset) {
    lines.push(`Vamos cadastrar ${purchaseName} no seu patrimônio.`);

    // Resumo do comportamento de valor escolhido no Step 3. Só aparece para
    // categorias que geram patrimônio.
    if (values.valueBehavior === "depreciating") {
      const rate = values.annualRatePct ?? 0;
      lines.push(`Esse item perde ${rate}%/ano de valor.`);
    } else if (values.valueBehavior === "appreciating") {
      const rate = values.annualRatePct ?? 0;
      lines.push(`Esse item ganha ${rate}%/ano de valor.`);
    } else if (values.valueBehavior === "stable") {
      lines.push("Esse item mantém o valor com o tempo.");
    }
  }

  if (values.paymentMethod === "credit_card") {
    const installments = values.installments ?? 1;
    const perInstallment =
      typeof values.valueCents === "bigint" && values.valueCents > 0n
        ? values.valueCents / BigInt(Math.max(1, Math.floor(installments)))
        : 0n;
    let cardLabel = "novo cartão";
    if (values.creditCardChoice && values.creditCardChoice !== "new") {
      const card = (creditCards ?? []).find((c) => c.id === values.creditCardChoice);
      cardLabel = card ? card.label : "cartão";
    } else if (values.creditCardChoice === "new") {
      cardLabel = (values.newCardLabel ?? "novo cartão").trim() || "novo cartão";
    }
    lines.push(
      `Vai criar uma dívida no ${cardLabel} de ${installments}× de ${formatBRL(perInstallment)}.`,
    );
  }

  if (values.paymentMethod === "loan") {
    const installments = values.installments ?? 1;
    const monthly =
      typeof values.monthlyPaymentCents === "bigint" ? values.monthlyPaymentCents : 0n;
    lines.push(`Vai criar um empréstimo de ${installments}× de ${formatBRL(monthly)}.`);
  }

  if (values.paymentMethod === "financing") {
    const term = values.financingTermMonths ?? 0;
    const ratePct = values.financingAnnualRatePct ?? 0;
    const downPayment =
      typeof values.downPaymentCents === "bigint" ? values.downPaymentCents : 0n;
    const principal =
      typeof values.valueCents === "bigint" ? values.valueCents - downPayment : 0n;
    if (downPayment > 0n) {
      lines.push(
        `Entrada de ${formatBRL(downPayment)} e financiamento de ${formatBRL(principal)} em ${term}× a ${ratePct}% ao ano.`,
      );
    } else {
      lines.push(
        `Financiamento de ${formatBRL(principal)} em ${term}× a ${ratePct}% ao ano.`,
      );
    }
  }

  if (values.paymentMethod === "cash") {
    if (values.fromCashAssetId) {
      const asset = (cashAssets ?? []).find((a) => a.id === values.fromCashAssetId);
      const label = asset?.label ?? "sua conta";
      if (asset) {
        const currentCents = BigInt(asset.currentValue.cents);
        const next =
          typeof values.valueCents === "bigint" ? currentCents - values.valueCents : currentCents;
        const clamped = next < 0n ? 0n : next;
        lines.push(`Vai sair da conta ${label} (saldo cai para ${formatBRL(clamped)}).`);
      } else {
        lines.push(`Vai sair da conta ${label}.`);
      }
    } else if (values.cashOnboarding === "create") {
      const name = values.cashAssetName.trim() || "sua conta";
      const balance =
        typeof values.currentBalanceCents === "bigint" ? values.currentBalanceCents : 0n;
      const next = typeof values.valueCents === "bigint" ? balance - values.valueCents : balance;
      const clamped = next < 0n ? 0n : next;
      lines.push(
        `Vamos cadastrar ${name} com saldo de ${formatBRL(balance)} (cai para ${formatBRL(clamped)} após a compra).`,
      );
    } else {
      lines.push("Lembra de adicionar sua conta corrente em Patrimônio para acompanhar saldo.");
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-md">
        <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-primary)] opacity-70">
          Resumo
        </div>
        <ul className="mt-2 flex flex-col gap-2">
          {lines.map((line, i) => (
            <li key={i} className="text-[14px] leading-[1.45] text-[color:var(--text-primary)]">
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2.5 text-[12px] text-[color:var(--text-primary)] opacity-80">
        Compra: {purchaseName}, valor {formatBRL(values.valueCents)}.
      </div>

      {serverError ? (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-3 py-2 text-[13px] text-[color:var(--semantic-negative)]"
        >
          {serverError}
        </div>
      ) : null}
    </>
  );
}
