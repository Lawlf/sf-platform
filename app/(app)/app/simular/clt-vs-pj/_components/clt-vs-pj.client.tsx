"use client";

import { AlertTriangle, Briefcase, Building2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import type { MeiActivity } from "@/domain/services/brazil-simples-tax";
import {
  EmployeeVsContractorService,
  type AnexoChoice,
  type PjRegime,
} from "@/domain/services/employee-vs-contractor.service";

import { HowItWorksSheet } from "../../../_components/how-it-works-sheet";
import { MoneyInput } from "../../../_components/money-input";
import { WizardRadioCard } from "../../../dividas/nova/_components/wizard-radio-card";
import { BreakdownLine, ResultCard } from "../../_components/sim-result";
import { SimSlider } from "../../_components/sim-slider";

interface FormValues {
  cltGrossCents: bigint;
  pjRevenueCents: bigint;
  proLaboreCents: bigint;
  accountantCents: bigint;
  businessCostsCents: bigint;
}

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const MEI_LABELS: Record<MeiActivity, { title: string; desc: string }> = {
  comercio: { title: "Comércio", desc: "Venda de produtos." },
  servicos: { title: "Serviços", desc: "Prestação de serviço." },
  ambos: { title: "Ambos", desc: "Produto + serviço." },
};

export function CltVsPjClient({ prefill }: { prefill: { cltGrossCents: string } }) {
  const form = useForm<FormValues>({
    defaultValues: {
      cltGrossCents: BigInt(prefill.cltGrossCents),
      pjRevenueCents: 0n as unknown as bigint,
      proLaboreCents: 0n as unknown as bigint,
      accountantCents: 0n as unknown as bigint,
      businessCostsCents: 0n as unknown as bigint,
    },
  });

  const cltGross = normalizeCents(useWatch({ control: form.control, name: "cltGrossCents" }));
  const pjRevenue = normalizeCents(useWatch({ control: form.control, name: "pjRevenueCents" }));
  const proLabore = normalizeCents(useWatch({ control: form.control, name: "proLaboreCents" }));
  const accountant = normalizeCents(useWatch({ control: form.control, name: "accountantCents" }));
  const businessCosts = normalizeCents(useWatch({ control: form.control, name: "businessCostsCents" }));

  const [dependents, setDependents] = useState(0);
  const [includeBenefits, setIncludeBenefits] = useState(true);
  const [regime, setRegime] = useState<PjRegime>("simples");
  const [meiActivity, setMeiActivity] = useState<MeiActivity>("servicos");
  const [anexo, setAnexo] = useState<AnexoChoice>("auto");
  // Modo rapido: so salario + faturamento + MEI/Simples. O resto (dependentes,
  // beneficios, pro-labore, contador, anexo, custos) fica atras de "Ajustar detalhes".
  const [showDetails, setShowDetails] = useState(false);

  const result = useMemo(
    () =>
      EmployeeVsContractorService.compute({
        cltGrossCents: cltGross,
        dependents,
        includeCltBenefits: includeBenefits,
        pjRevenueCents: pjRevenue,
        pjRegime: regime,
        meiActivity,
        anexo,
        proLaboreCents: proLabore,
        accountantCents: accountant,
        businessCostsCents: businessCosts,
      }),
    [
      cltGross,
      dependents,
      includeBenefits,
      pjRevenue,
      regime,
      meiActivity,
      anexo,
      proLabore,
      accountant,
      businessCosts,
    ],
  );

  const hasInputs = cltGross > 0n && pjRevenue > 0n;

  return (
    <div className="flex flex-col gap-4">
      {/* Lado CLT */}
      <section className="glass-light p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
            Lado CLT
          </h2>
          <HowItWorksSheet topic="clt-vs-pj-clt" variant="brand" />
        </div>
        <div className="flex flex-col gap-3">
          <MoneyInput
            control={form.control}
            name="cltGrossCents"
            label="Salário bruto CLT"
            required
            helper="Puxado da sua renda; ajuste se precisar."
          />
          {showDetails ? (
            <>
              <SimSlider
                label="Dependentes"
                value={dependents}
                min={0}
                max={8}
                step={1}
                displayValue={`${dependents}`}
                onChange={setDependents}
              />
              <div className="grid grid-cols-2 gap-2">
                <WizardRadioCard
                  title="Só o líquido"
                  description="Compara só o que cai na conta."
                  active={!includeBenefits}
                  onSelect={() => setIncludeBenefits(false)}
                />
                <WizardRadioCard
                  title="Com benefícios"
                  description="Soma FGTS, 13º e 1/3 de férias."
                  active={includeBenefits}
                  onSelect={() => setIncludeBenefits(true)}
                />
              </div>
              {includeBenefits ? (
                <p className="text-[0.6875rem] leading-relaxed text-[color:var(--text-secondary)]">
                  Somando ao bruto: FGTS <strong>8%</strong> + 13º <strong>8,33%</strong> (1/12) +
                  1/3 de férias <strong>2,78%</strong> (1/36) = <strong>~19,1%</strong>.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </section>

      {/* Lado PJ */}
      <section className="glass-light p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
            Lado PJ
          </h2>
          <HowItWorksSheet topic="clt-vs-pj-pj" variant="brand" />
        </div>
        <div className="flex flex-col gap-3">
          <MoneyInput
            control={form.control}
            name="pjRevenueCents"
            label="Faturamento mensal"
            required
            helper="Quanto você emite de nota por mês."
          />
          <div className="grid grid-cols-2 gap-2">
            <WizardRadioCard
              title="MEI"
              description="DAS fixo. Até R$ 81 mil/ano."
              active={regime === "mei"}
              onSelect={() => setRegime("mei")}
            />
            <WizardRadioCard
              title="Simples (ME)"
              description="Imposto sobre o faturamento."
              active={regime === "simples"}
              onSelect={() => setRegime("simples")}
            />
          </div>

          {/* Seção avançada por regime (só no modo detalhado) */}
          {showDetails ? (
            regime === "mei" ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]">
                Atividade
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(MEI_LABELS) as MeiActivity[]).map((a) => (
                  <WizardRadioCard
                    key={a}
                    title={MEI_LABELS[a].title}
                    description={MEI_LABELS[a].desc}
                    active={meiActivity === a}
                    onSelect={() => setMeiActivity(a)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              <MoneyInput
                control={form.control}
                name="proLaboreCents"
                label="Pró-labore mensal (opcional)"
                helper="Salário que você tira da empresa. Quando passa de 28% do faturamento, cai na faixa de imposto mais barata."
              />
              <MoneyInput
                control={form.control}
                name="accountantCents"
                label="Contador por mês (opcional)"
                helper="Custo da contabilidade obrigatória no Simples."
              />
              <div className="flex flex-col gap-1.5">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]">
                  Como calcular o imposto
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <WizardRadioCard
                    title="Automático"
                    description="A gente decide"
                    active={anexo === "auto"}
                    onSelect={() => setAnexo("auto")}
                  />
                  <WizardRadioCard
                    title="Mais barata"
                    description="Anexo III"
                    active={anexo === "III"}
                    onSelect={() => setAnexo("III")}
                  />
                  <WizardRadioCard
                    title="Mais cara"
                    description="Anexo V"
                    active={anexo === "V"}
                    onSelect={() => setAnexo("V")}
                  />
                </div>
              </div>
            </>
            )
          ) : null}

          {showDetails ? (
            <MoneyInput
              control={form.control}
              name="businessCostsCents"
              label="Custos do negócio (opcional)"
              helper="Faturamento não é lucro. Revenda: custo dos produtos. Serviço: costuma ser zero (você vende sua hora)."
            />
          ) : null}

          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="focus-ring w-fit text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
          >
            {showDetails ? "Esconder detalhes" : "Ajustar detalhes (dependentes, imposto, custos)"}
          </button>
        </div>
      </section>

      {hasInputs ? (
        <>
          <VerdictHero result={result} />

          <section className="grid gap-3 sm:grid-cols-2">
            <ResultCard
              title="CLT"
              subtitle={includeBenefits ? "Líquido + benefícios" : "Salário líquido"}
            >
              <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
                {brl(result.cltCompareCents)}
              </div>
              {includeBenefits ? (
                <p className="text-[0.6875rem] text-[color:var(--text-secondary)]">
                  Líquido {brl(result.clt.netCents)} + FGTS/13º/férias.
                </p>
              ) : null}
            </ResultCard>
            <ResultCard
              title="PJ"
              subtitle={regime === "mei" ? "MEI" : `Simples · Anexo ${result.pj.anexoUsed ?? ""}`}
            >
              <div className="text-[1.375rem] font-extrabold leading-none text-[color:var(--text-primary)]">
                {brl(result.pj.netCents)}
              </div>
              <p className="text-[0.6875rem] text-[color:var(--text-secondary)]">Sobra no bolso.</p>
            </ResultCard>
          </section>

          <section className="glass-light p-4">
            <h3 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.6px] text-[color:var(--color-brand-800)]">
              Custos do PJ
            </h3>
            <div className="flex flex-col">
              <BreakdownLine label="Faturamento" value={brl(pjRevenue)} />
              <BreakdownLine
                label={regime === "mei" ? "DAS (fixo)" : "Imposto (DAS)"}
                value={`- ${brl(result.pj.dasCents)}`}
                tone="negative"
              />
              {result.pj.proLaboreInssCents > 0n ? (
                <BreakdownLine
                  label="INSS do pró-labore"
                  value={`- ${brl(result.pj.proLaboreInssCents)}`}
                  tone="negative"
                />
              ) : null}
              {result.pj.proLaboreIrrfCents > 0n ? (
                <BreakdownLine
                  label="IR do pró-labore"
                  value={`- ${brl(result.pj.proLaboreIrrfCents)}`}
                  tone="negative"
                />
              ) : null}
              {result.pj.accountantCents > 0n ? (
                <BreakdownLine
                  label="Contador"
                  value={`- ${brl(result.pj.accountantCents)}`}
                  tone="negative"
                />
              ) : null}
              {result.pj.businessCostsCents > 0n ? (
                <BreakdownLine
                  label="Custos do negócio"
                  value={`- ${brl(result.pj.businessCostsCents)}`}
                  tone="negative"
                />
              ) : null}
              <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-[color:var(--border-soft)] pt-2">
                <span className="text-[0.8125rem] font-bold text-[color:var(--text-primary)]">
                  Sobra (PJ)
                </span>
                <span className="text-[0.875rem] font-extrabold text-[color:var(--semantic-positive)]">
                  {brl(result.pj.netCents)}
                </span>
              </div>
            </div>
            {regime === "simples" && result.pj.fatorR !== null ? (
              <p className="mt-3 text-[0.6875rem] text-[color:var(--text-secondary)]">
                Fator R: {(result.pj.fatorR * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% →
                Anexo {result.pj.anexoUsed}.
              </p>
            ) : null}
          </section>

          {result.pj.overMeiLimit ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-[color:var(--semantic-warning)]/30 bg-[color:var(--semantic-warning)]/10 px-3 py-2 text-[0.8125rem] text-[color:var(--semantic-warning)]"
            >
              <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
              Esse faturamento passa do teto do MEI (R$ 81 mil/ano). Você precisaria do Simples (ME).
            </p>
          ) : null}
        </>
      ) : (
        <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-6 text-center backdrop-blur-xl">
          <p className="text-[0.875rem] text-[color:var(--text-secondary)]">
            Informe o salário CLT e o faturamento PJ para comparar.
          </p>
        </section>
      )}

      <p className="text-[0.6875rem] leading-relaxed text-[color:var(--text-secondary)]">
        Estimativa com tabelas 2025. No Simples, lucros distribuídos são isentos de IR; encargos,
        contador e o enquadramento real variam. Considere também direitos do CLT que o PJ não tem
        (férias, FGTS, seguro-desemprego).
      </p>
    </div>
  );
}

function VerdictHero({
  result,
}: {
  result: ReturnType<typeof EmployeeVsContractorService.compute>;
}) {
  if (result.recommendation === "empate") {
    return (
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl">
        <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-[color:var(--text-muted)]">
          Empate
        </span>
        <div className="mt-1 text-[1.375rem] font-extrabold text-[color:var(--text-primary)]">
          Praticamente igual
        </div>
        <p className="mt-2 text-[0.75rem] text-[color:var(--text-secondary)]">
          No dinheiro, dá quase o mesmo. Decida pela estabilidade e direitos do CLT.
        </p>
      </section>
    );
  }
  const pjWins = result.recommendation === "pj";
  const gradient = pjWins
    ? "bg-[linear-gradient(135deg,#ef7a1a,#f28e25)] shadow-[0_14px_32px_rgba(239,122,26,0.30)]"
    : "bg-[linear-gradient(135deg,#16a34a,#22c55e)] shadow-[0_14px_32px_rgba(22,163,74,0.30)]";
  const Icon = pjWins ? Building2 : Briefcase;
  return (
    <section className={`rounded-2xl p-4 text-white ${gradient}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-white/85">
            Sobra mais como
          </span>
          <div className="mt-1 text-[1.625rem] font-extrabold leading-none md:text-[1.875rem]">
            {pjWins ? "PJ" : "CLT"}
          </div>
          <p className="mt-2 text-[0.75rem] font-medium text-white/85">
            Diferença de <strong>{brl(result.differenceCents)}</strong> por mês.
          </p>
        </div>
        <Icon size={38} strokeWidth={1.5} className="shrink-0 text-white/85" aria-hidden />
      </div>
    </section>
  );
}

function normalizeCents(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.round(value));
  if (typeof value === "string" && value !== "") {
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  }
  return 0n;
}
