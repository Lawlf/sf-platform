"use client";

import { useState } from "react";

import { type Currency } from "@/domain/value-objects/money.vo";

import { PersonalLoanForm } from "./personal-loan-form";
import { SimpleInstallmentDebtForm, type LoanSeed } from "./simple-installment-debt-form";

interface Props {
  initialScenario: "new" | "ongoing";
  defaultCurrency: Currency;
  initialLinkAssetId: string | null;
}

// Empréstimo/financiamento entram pelo modo simples (parcela + faltam quantas),
// que é o que o ICP sabe de cabeça. Quem chega por "dívida antiga" ou vinculando
// um bem, ou quem pede, cai no formulário detalhado (taxa, prazo, amortização)
// JÁ COM o que digitou no simples (sem retrabalho).
export function LoanEntry({ initialScenario, defaultCurrency, initialLinkAssetId }: Props) {
  const startDetailed = initialScenario === "ongoing" || initialLinkAssetId !== null;
  const [detailed, setDetailed] = useState(startDetailed);
  const [seed, setSeed] = useState<LoanSeed | null>(null);

  if (detailed) {
    return (
      <PersonalLoanForm
        initialScenario={seed ? "new" : initialScenario}
        defaultCurrency={defaultCurrency}
        initialLinkAssetId={initialLinkAssetId}
        seed={seed}
      />
    );
  }

  return (
    <SimpleInstallmentDebtForm
      defaultCurrency={defaultCurrency}
      onWantDetailed={(s) => {
        setSeed(s);
        setDetailed(true);
      }}
    />
  );
}
