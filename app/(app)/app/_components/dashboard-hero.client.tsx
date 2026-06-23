"use client";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo } from "react";

import { MonthYear } from "@/domain/value-objects/month-year.vo";

import { fetchMonthDetail, type SerializedMonthDetail } from "../_actions/timeline-month-detail";
import { fetchWalletBalance } from "../_actions/wallet-queries";
import { queryKeys } from "../_lib/query-keys";

import { HowItWorksSheet } from "./how-it-works-sheet";
import { HideableValue } from "./money-visibility/hideable-value.client";

function formatBrl(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const reais = Number(abs) / 100;
  const fmt = reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `${negative ? "-" : ""}${fmt}`;
}

function stripMinus(formatted: string): string {
  return formatted.replace(/^[-−]\s*/, "");
}

/**
 * Verbo do "sobra/falta" com concordância de número: singular só quando o valor
 * é exatamente R$ 1,00 (100 centavos); caso contrário, plural.
 */
function leftover(projCents: bigint): { verb: string; positive: boolean } {
  const positive = projCents >= 0n;
  const abs = projCents < 0n ? -projCents : projCents;
  const singular = abs === 100n;
  const verb = positive ? (singular ? "sobra" : "sobram") : singular ? "falta" : "faltam";
  return { verb, positive };
}

const CURRENT_MONTH_NAME = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date());

interface Props {
  monthIso: string;
  initialData: SerializedMonthDetail | null;
  // Sobra realizada do mes passado, pro fio de progresso ("voce melhorou?").
  previousMonth?: { label: string; freeCents: string } | null;
  // Marco do StoryDetection (ex: "3 meses no azul"), so quando existe.
  milestone?: string | null;
}

export function DashboardHeroClient({
  monthIso,
  initialData,
  previousMonth = null,
  milestone = null,
}: Props) {
  const month = useMemo(() => MonthYear.fromIso(monthIso), [monthIso]);
  const timelineHref = `/app/linha-do-tempo/${monthIso}` as Route;

  const { data: monthDetail } = useSuspenseQuery({
    queryKey: ["timeline", "monthDetail", monthIso],
    queryFn: () => fetchMonthDetail({ monthIso }),
    initialData,
  });

  const { data: walletBal, isError: walletError } = useQuery({
    queryKey: queryKeys.walletBalance,
    queryFn: () => fetchWalletBalance(),
  });

  if (!monthDetail) {
    return (
      <p className="text-sm text-[color:var(--text-secondary)]">
        Cadastre renda e dívidas para ver como seu mês fecha.
      </p>
    );
  }

  const incomeCents = BigInt(monthDetail.totals.income.cents);
  const freeBalanceCents = BigInt(monthDetail.totals.free.cents);

  const useWallet = !walletError && walletBal != null && !walletBal.needsAnchor;

  // Mês atual sem renda registrada: R$0 aqui significa "sem dado", não déficit
  // nem zero oco. Suprimimos a moldura de projeção/falta. Quando a carteira está
  // ancorada o reactiveBalance é um saldo real (o que a pessoa tem), então segue
  // normal; o estado honesto vale só pra moldura de fallback/projeção.
  const noIncome = incomeCents === 0n;
  const noIncomeState = noIncome && !useWallet;

  // Projeção do mês inteiro (o "buraco" ou a sobra se nada mudar).
  const projCents = useWallet ? BigInt(walletBal.monthEndProjection.cents) : freeBalanceCents;
  const projFormatted = useWallet
    ? stripMinus(walletBal.monthEndProjection.formatted)
    : stripMinus(formatBrl(freeBalanceCents));
  const { verb, positive } = leftover(projCents);

  // Renda variavel (isEstimated): o numero grande conta com ela, mas a parte
  // garantida (sem o variavel) e o piso honesto pro freela de renda irregular.
  const estimatedIncomeCents = BigInt(monthDetail.totals.estimatedIncome.cents);
  const hasVariableIncome = monthDetail.hasEstimatedIncome && estimatedIncomeCents > 0n && !noIncome;
  const floorCents = projCents - estimatedIncomeCents;
  const floor = leftover(floorCents);
  const floorFmt = stripMinus(formatBrl(floorCents));

  // Fio de progresso: comparo a sobra realizada do mes passado com a projecao
  // de agora. So aparece quando ha mes anterior e ha renda no mes atual.
  const prevCents = previousMonth ? BigInt(previousMonth.freeCents) : null;
  const showProgress = prevCents !== null && !noIncomeState;
  const prevPositive = (prevCents ?? 0n) >= 0n;
  const prevAbs = stripMinus(formatBrl(prevCents ?? 0n));
  const prevVerb = prevPositive ? "sobrou" : "faltou";

  // Valor "hoje" do herói, por prioridade:
  //   a) carteira ancorada → saldo reativo;
  //   b) sem carteira mas com datas nas linhas → realizado até hoje;
  //   c) sem datas → não rotula projeção como "hoje" (degradação honesta).
  const hasRowDates =
    monthDetail.incomes.every((i) => i.dateIso) &&
    monthDetail.expenses.every((e) => e.dateIso) &&
    monthDetail.payments.every((p) => p.dateIso);

  const realizedTodayCents = BigInt(monthDetail.totals.realizedFree.cents);
  const todayCents = useWallet ? BigInt(walletBal.reactiveBalance.cents) : realizedTodayCents;
  const projectionIsFlat = projCents === todayCents;

  const todayMode = useWallet ? "wallet" : hasRowDates ? "realized" : "projection";

  const eyebrow =
    todayMode === "wallet"
      ? "Saldo da Carteira · hoje"
      : todayMode === "projection"
        ? `Seu mês · no fim de ${CURRENT_MONTH_NAME}`
        : "Seu mês · hoje";

  const bigFormatted = useWallet
    ? walletBal.reactiveBalance.formatted
    : todayMode === "realized"
      ? formatBrl(realizedTodayCents)
      : formatBrl(projCents);

  // Sub-linha de projeção só nos casos a/b; no caso c o número grande já é a
  // projeção (evita duplicar). Sem renda registrada também não é déficit: nunca
  // dispara a moldura negativa nem a linha "faltam R$X"; usamos um empurrão calmo.
  const showProjectionLine = !noIncome;
  const showNudge = noIncome;

  const negative = !positive && !noIncome;

  // Tratamento de estado negativo (buraco): herói escuro/alerta em vez do
  // laranja, com acento vermelho na linha "falta" e no selo.
  const heroSurface = negative
    ? "border border-[color:var(--border-soft)] bg-[linear-gradient(135deg,#2a221d_0%,#231c18_100%)] shadow-[0_12px_28px_rgba(0,0,0,0.4)]"
    : "border border-[color:var(--color-brand-500)]/20 bg-[linear-gradient(135deg,#d96813_0%,#c25d15_55%,#ba5717_100%)] shadow-[0_12px_28px_rgba(239,122,26,0.28)]";

  const bigColor = negative ? "text-white" : "text-white";
  const eyebrowColor = negative ? "text-white/[0.92]" : "text-white";
  const chevronColor = negative ? "text-white/60" : "text-white/85";
  const ruleColor = negative ? "bg-white/[0.18]" : "bg-white/[0.22]";
  const sublineColor = negative ? "text-[#fca5a5]" : "text-white/90";
  const badgeClass = negative
    ? "bg-[#fca5a5]/[0.16] text-[#fca5a5]"
    : "bg-white/20 text-white";
  const badgeLabel = positive ? "Sobra do mês" : "Falta do mês";
  const showBadge = !noIncome;

  // No fallback sem renda, o valor grande vira texto-estado (não é dinheiro).
  const showStateText = noIncomeState;
  const stateText = "Sem renda registrada";
  const nudgeText = "Cadastre sua renda pra ver como o mês fecha.";

  const heroHref = noIncomeState ? ("/app/renda/nova" as Route) : timelineHref;
  const ariaLabel = noIncomeState
    ? `${stateText}. ${nudgeText}`
    : noIncome
      ? `Ver detalhes de ${month.format()}. ${bigFormatted}. ${nudgeText}`
      : projectionIsFlat
        ? `Ver detalhes de ${month.format()}. ${bigFormatted}. Nada previsto mexe nele até o fim de ${CURRENT_MONTH_NAME}.`
        : `Ver detalhes de ${month.format()}. ${bigFormatted}. ${verb} ${projFormatted} no fim de ${CURRENT_MONTH_NAME}.`;

  return (
    <div className="relative">
      <Link
        href={heroHref}
        aria-label={ariaLabel}
        className={`focus-ring relative flex min-h-[126px] w-full items-center overflow-hidden rounded-2xl px-5 py-5 text-left transition-[filter] hover:brightness-105 md:min-h-[148px] md:px-6 md:py-6 ${heroSurface}`}
      >
        {!negative ? (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.20),transparent_70%)]"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(40,18,0,0.22),transparent_75%)]"
            />
          </>
        ) : null}
        <div className="relative flex w-full items-center justify-between gap-3">
          <div className="flex-1">
            <span
              className={`text-[0.625rem] font-bold uppercase tracking-[0.7px] ${eyebrowColor}`}
            >
              {eyebrow}
            </span>
            {showStateText ? (
              <div className="mt-1.5 text-[1.375rem] font-bold leading-tight text-white/80 md:text-[1.5rem]">
                {stateText}
              </div>
            ) : (
              <div
                className={`mt-1.5 text-[1.875rem] font-extrabold leading-none md:text-[2.25rem] ${bigColor}`}
              >
                <HideableValue>{bigFormatted}</HideableValue>
              </div>
            )}
            {showProjectionLine ? (
              <>
                <span
                  aria-hidden
                  className={`mt-3 block h-px w-full max-w-[15rem] ${ruleColor}`}
                />
                <span
                  className={`mt-3 flex items-center gap-1.5 text-[0.8125rem] font-semibold leading-snug ${sublineColor}`}
                >
                  {projectionIsFlat ? (
                    <>Nada previsto mexe nele até o fim de {CURRENT_MONTH_NAME}.</>
                  ) : todayMode === "projection" ? (
                    positive ? (
                      <>É quanto deve sobrar no fim de {CURRENT_MONTH_NAME}, se nada mudar.</>
                    ) : (
                      <>É quanto deve faltar no fim de {CURRENT_MONTH_NAME}, se nada mudar.</>
                    )
                  ) : (
                    <>
                      Se nada mudar, {verb} <HideableValue>{projFormatted}</HideableValue> no fim de{" "}
                      {CURRENT_MONTH_NAME}
                    </>
                  )}
                </span>
              </>
            ) : null}
            {hasVariableIncome ? (
              <span className={`mt-2 block text-[0.75rem] leading-snug ${sublineColor}`}>
                Parte da sua renda varia. Sem ela, {floor.verb}{" "}
                <HideableValue>{floorFmt}</HideableValue>.
              </span>
            ) : null}
            {showNudge ? (
              <>
                <span
                  aria-hidden
                  className="mt-3 block h-px w-full max-w-[15rem] bg-white/[0.22]"
                />
                <span className="mt-3 block text-[0.8125rem] font-medium leading-snug text-white/80">
                  {nudgeText}
                </span>
              </>
            ) : null}
            {showProgress ? (
              <span className="mt-1.5 block text-[0.75rem] leading-snug text-white/65">
                {projCents > (prevCents ?? 0n)
                  ? "Melhor que "
                  : projCents < (prevCents ?? 0n)
                    ? "Abaixo de "
                    : "No mesmo ritmo de "}
                {previousMonth?.label?.toLowerCase()} ({prevVerb}{" "}
                <HideableValue>{prevAbs}</HideableValue>)
              </span>
            ) : null}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {showBadge ? (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-bold backdrop-blur ${badgeClass}`}
                >
                  {badgeLabel}
                </span>
              ) : null}
              {milestone ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[0.6875rem] font-bold text-white backdrop-blur">
                  {milestone}
                </span>
              ) : null}
            </div>
          </div>
          <ChevronRight
            size={22}
            strokeWidth={2.25}
            className={`shrink-0 ${chevronColor}`}
            aria-hidden
          />
        </div>
      </Link>
      <div
        className={`pointer-events-none absolute right-3 top-3 z-10 md:right-4 md:top-4 ${negative ? "text-white/80" : "text-white"}`}
      >
        <div className="pointer-events-auto">
          <HowItWorksSheet topic="saldo-livre" variant="chip" />
        </div>
      </div>
    </div>
  );
}
