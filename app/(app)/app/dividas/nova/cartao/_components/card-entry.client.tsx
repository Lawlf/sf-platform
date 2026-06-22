"use client";

import { useState } from "react";

import { type Currency } from "@/domain/value-objects/money.vo";

import { type CardSeed, CreditCardForm } from "./credit-card-form";
import { CreditCardFormDetailed } from "./credit-card-form-detailed";

interface Props {
  existing: boolean;
  defaultCurrency: Currency;
  initialLinkAssetId: string | null;
}

// Padrao: entra no modo enxuto (fatura + dia que vence). Quem ja tem todos os
// dados, ou chega por "cartao antigo"/vinculando um bem, cai no completo JA COM
// o que digitou no enxuto (limite, juros do rotativo, compras parceladas).
export function CardEntry({ existing, defaultCurrency, initialLinkAssetId }: Props) {
  const startDetailed = existing || initialLinkAssetId !== null;
  const [detailed, setDetailed] = useState(startDetailed);
  const [seed, setSeed] = useState<CardSeed | null>(null);

  if (detailed) {
    return (
      <CreditCardFormDetailed
        existing={existing}
        defaultCurrency={defaultCurrency}
        initialLinkAssetId={initialLinkAssetId}
        seed={seed}
      />
    );
  }

  return (
    <CreditCardForm
      existing={existing}
      defaultCurrency={defaultCurrency}
      initialLinkAssetId={initialLinkAssetId}
      onWantDetailed={(s) => {
        setSeed(s);
        setDetailed(true);
      }}
    />
  );
}
