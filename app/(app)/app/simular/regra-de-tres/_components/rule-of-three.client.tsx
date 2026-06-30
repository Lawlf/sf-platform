"use client";

import { useId, useMemo, useState } from "react";

import { RuleOfThreeService, type RuleOfThreeKind } from "@/domain/services/rule-of-three.service";

import { wizardInputClass } from "@/ui/wizard-field";
import { WizardRadioCard } from "../../../dividas/nova/_components/wizard-radio-card";

const NUM_FMT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 6 });

function parseNumber(raw: string): number {
  if (raw.trim() === "") return Number.NaN;
  return Number.parseFloat(raw.replace(/\./g, "").replace(",", "."));
}

export function RuleOfThreeClient() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const [kind, setKind] = useState<RuleOfThreeKind>("direct");

  const result = useMemo(
    () =>
      RuleOfThreeService.solve({
        a: parseNumber(a),
        b: parseNumber(b),
        c: parseNumber(c),
        kind,
      }),
    [a, b, c, kind],
  );

  const filled = a.trim() !== "" && b.trim() !== "" && c.trim() !== "";

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-light p-4">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
          Tipo de proporção
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <WizardRadioCard
            title="Direta"
            description="Crescem juntas (mais peças, mais preço)."
            active={kind === "direct"}
            onSelect={() => setKind("direct")}
          />
          <WizardRadioCard
            title="Inversa"
            description="Uma sobe, a outra desce (mais gente, menos tempo)."
            active={kind === "inverse"}
            onSelect={() => setKind("inverse")}
          />
        </div>

        <p className="mb-2 mt-4 text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-muted)]">
          A está para B, assim como C está para X
        </p>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="A" value={a} onChange={setA} />
          <NumberField label="B" value={b} onChange={setB} />
          <NumberField label="C" value={c} onChange={setC} />
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--color-brand-800)]">
              X (resultado)
            </span>
            <div className="flex h-[46px] items-center justify-center rounded-xl border-[1.5px] border-dashed border-[color:var(--color-brand-500)]/50 bg-[color:var(--color-brand-500)]/[0.06] px-3 text-[1.0625rem] font-extrabold text-[color:var(--color-brand-800)]">
              {filled && result.x !== null ? NUM_FMT.format(result.x) : "?"}
            </div>
          </div>
        </div>
      </section>

      {filled && result.x === null ? (
        <p
          role="alert"
          className="rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-3 py-2 text-[0.8125rem] text-[color:var(--semantic-negative)]"
        >
          Não dá pra dividir por zero. Confira os valores.
        </p>
      ) : null}

      <p className="text-[0.75rem] leading-relaxed text-[color:var(--text-secondary)]">
        {kind === "direct"
          ? "Direta: X = B × C ÷ A. Ex.: 3 peças custam R$ 12, então 5 peças custam R$ 20."
          : "Inversa: X = A × B ÷ C. Ex.: 4 pessoas levam 6 dias, então 8 pessoas levam 3 dias."}
      </p>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className={wizardInputClass}
      />
    </div>
  );
}
