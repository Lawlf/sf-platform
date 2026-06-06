"use client";

import { useState, useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { CURRENCIES, type Currency } from "@/domain/value-objects/money.vo";

import { setBaseCurrencyAction } from "../_actions/set-base-currency.action";

const LABELS: Record<Currency, string> = {
  BRL: "Real (R$)",
  USD: "Dólar (US$)",
  EUR: "Euro (EUR)",
  GBP: "Libra (GBP)",
};

const FIELD_LABEL =
  "text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]";
const TRIGGER = "h-12 w-full max-w-[320px] rounded-xl";

export function RegionPreferences({ current }: { current: Currency }) {
  const [value, setValue] = useState<Currency>(current);
  const [pending, startTransition] = useTransition();

  function onChange(next: Currency) {
    if (next === value) return;
    setValue(next);
    const fd = new FormData();
    fd.set("currency", next);
    startTransition(() => {
      void setBaseCurrencyAction(fd);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>País</span>
        <Select value="BR" disabled>
          <SelectTrigger className={TRIGGER} aria-label="País">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BR">Brasil</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>Idioma</span>
        <Select value="pt-BR" disabled>
          <SelectTrigger className={TRIGGER} aria-label="Idioma">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[0.6875rem] text-[color:var(--text-muted)]">
          Mais idiomas em breve.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="moeda-padrao" className={FIELD_LABEL}>
          Moeda padrão
        </label>
        <Select value={value} onValueChange={(v) => onChange(v as Currency)} disabled={pending}>
          <SelectTrigger id="moeda-padrao" className={TRIGGER} aria-label="Moeda padrão">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                <span className="flex items-baseline gap-2">
                  <span className="font-bold tracking-[0.5px]">{c}</span>
                  <span className="text-[0.75rem] text-[color:var(--text-muted)]">{LABELS[c]}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[0.6875rem] text-[color:var(--text-muted)]">
          Já vem selecionada ao cadastrar patrimônio, renda ou dívida. Dá pra trocar em cada
          lançamento.
        </span>
      </div>
    </div>
  );
}
