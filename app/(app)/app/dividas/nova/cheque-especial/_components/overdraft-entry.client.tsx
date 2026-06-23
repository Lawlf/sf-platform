"use client";

import { useState } from "react";

import { type Currency } from "@/domain/value-objects/money.vo";

import { OverdraftForm, type OverdraftSeed } from "./overdraft-form";
import { OverdraftFormDetailed } from "./overdraft-form-detailed";

interface Props {
  defaultCurrency: Currency;
}

// Padrao: so "quanto to no vermelho" (taxa assume o teto legal). Quem sabe a
// taxa e o banco certo abre o completo JA COM o que digitou.
export function OverdraftEntry({ defaultCurrency }: Props) {
  const [detailed, setDetailed] = useState(false);
  const [seed, setSeed] = useState<OverdraftSeed | null>(null);

  if (detailed) {
    return <OverdraftFormDetailed defaultCurrency={defaultCurrency} seed={seed} />;
  }

  return (
    <OverdraftForm
      defaultCurrency={defaultCurrency}
      onWantDetailed={(s) => {
        setSeed(s);
        setDetailed(true);
      }}
    />
  );
}
