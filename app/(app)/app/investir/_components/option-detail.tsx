"use client";

import { ArrowRight, HelpCircle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { buildGoalSeedQuery } from "../../simular/_lib/goal-seed";
import { OPTION_GROWTH, type InvestOption } from "../_lib/options";
import type { EarlyWithdrawalSample, Projection } from "../_lib/projection";

import { EarlyWithdrawalChart } from "./early-withdrawal-chart";
import { PerfilBars } from "./perfil-bars";
import { ProjectionChart } from "./projection-chart";
import { ScenarioProjection } from "./scenario-projection.client";

const BOUGHT_FIRST = new Set(["acoes", "fii", "cripto", "fundos"]);

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface OptionDetailProps {
  option: InvestOption;
  amountCents: bigint;
  cdiAnnualPct: number;
  projection?: Projection | null;
  earlyWithdrawal?: EarlyWithdrawalSample[];
  onComoFunciona: () => void;
}

type Tab = "render" | "early";

export function OptionDetail({
  option,
  amountCents,
  cdiAnnualPct,
  projection,
  earlyWithdrawal,
  onComoFunciona,
}: OptionDetailProps) {
  const [tab, setTab] = useState<Tab>("render");
  const boughtFirst = BOUGHT_FIRST.has(option.key);
  const hasEarly = (earlyWithdrawal?.length ?? 0) > 1;

  const goalHref = `/app/metas/nova?${buildGoalSeedQuery({
    type: "savings",
    targetCents: amountCents.toString(),
    savedCents: "0",
    deadlineIso: null,
  })}` as Route;
  const assetHref = `/app/patrimonio/novo?category=${option.assetCategory}` as Route;

  const goalCta = {
    href: goalHref,
    label: boughtFirst ? "Ainda vou comprar, criar meta" : "Criar meta pra juntar",
  };
  const assetCta = {
    href: assetHref,
    label: boughtFirst ? "Já comprei, registrar" : "Já apliquei, registrar no patrimônio",
  };
  const primary = boughtFirst ? assetCta : goalCta;
  const secondary = boughtFirst ? goalCta : assetCta;

  const final = projection?.final ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Link
          href={primary.href}
          className="focus-ring inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-[0.875rem] font-bold text-white shadow-[0_8px_20px_-8px_rgba(239,122,26,0.6)] transition-[filter] hover:brightness-105"
          style={{ background: "linear-gradient(135deg, #f28e25, #ef7a1a)" }}
        >
          {primary.label}
          <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
        </Link>
        <Link
          href={secondary.href}
          className="focus-ring inline-flex w-full items-center justify-center rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface-2)] px-4 py-3 text-[0.875rem] font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-3)]"
        >
          {secondary.label}
        </Link>
      </div>

      {projection && final ? (
        <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
          {hasEarly ? (
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-full border border-[color:var(--border-soft)] bg-[color:var(--surface-3)] p-1">
              <TabButton active={tab === "render"} onClick={() => setTab("render")}>
                Deixar rendendo
              </TabButton>
              <TabButton active={tab === "early"} onClick={() => setTab("early")}>
                Sacar antes de 30 dias
              </TabButton>
            </div>
          ) : null}

          <div
            key={hasEarly ? tab : "render"}
            className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
          >
          {tab === "render" || !hasEarly ? (
            <>
              <ProjectionChart points={projection.points} principalCents={amountCents} />
              <dl className="mt-3 flex flex-col gap-1.5 text-[0.8125rem]">
                <Row label="Você aplica" value={brl(amountCents)} />
                <Row label="Rende no ano" value={`+ ${brl(final.grossYieldCents)}`} />
                <Row
                  label="Imposto de Renda"
                  value={final.taxCents > 0n ? `- ${brl(final.taxCents)}` : "Isento"}
                />
                <div className="mt-1 flex items-baseline justify-between border-t border-[color:var(--border-soft)] pt-2">
                  <dt className="text-[0.8125rem] font-semibold text-[color:var(--text-secondary)]">
                    Fica com
                  </dt>
                  <dd className="text-[1.0625rem] font-extrabold text-[color:var(--text-primary)]">
                    {brl(final.finalCents)}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <EarlyWithdrawalChart series={earlyWithdrawal ?? []} />
          )}
          </div>
        </section>
      ) : null}

      {!projection && amountCents > 0n ? (
        <ScenarioProjection
          amountCents={amountCents}
          growthKind={OPTION_GROWTH[option.key] ?? "appreciation"}
          cdiAnnualPct={cdiAnnualPct}
        />
      ) : null}

      <PerfilBars optionKey={option.key} />

      <button
        type="button"
        onClick={onComoFunciona}
        className="focus-ring inline-flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)]"
      >
        <span className="inline-flex items-center gap-2 text-[0.8125rem] font-medium text-[color:var(--text-primary)]">
          <HelpCircle size={15} strokeWidth={2} aria-hidden className="text-[color:var(--text-muted)]" />
          Como funciona {option.name}
        </span>
        <ArrowRight size={18} strokeWidth={2.25} className="shrink-0 text-[color:var(--text-muted)]" aria-hidden />
      </button>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`focus-ring rounded-full px-3 py-2 text-[0.75rem] font-bold transition-colors ${
        active
          ? "text-white shadow-[0_4px_12px_-4px_rgba(239,122,26,0.5)]"
          : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
      }`}
      style={active ? { background: "linear-gradient(135deg, #f28e25, #ef7a1a)" } : undefined}
    >
      {children}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-[color:var(--text-secondary)]">{label}</dt>
      <dd className="font-semibold text-[color:var(--text-primary)]">{value}</dd>
    </div>
  );
}
