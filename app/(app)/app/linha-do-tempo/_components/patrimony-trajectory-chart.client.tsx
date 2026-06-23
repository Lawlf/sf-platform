"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, Receipt, SlidersHorizontal, Target } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";

import {
  fetchPlanningProjection,
  type PlanningProjectionPayload,
} from "../../_actions/planning-queries";
import { useMoneyVisibility } from "../../_components/money-visibility/money-visibility-provider.client";

import { CascadeConfigPanel } from "./cascade-config-panel.client";
import { UnifiedTrajectoryChart, type UnifiedPoint } from "./unified-trajectory-chart.client";

export interface TrajectoryPoint {
  monthIso: string;
  netWorthCents: string;
  debtsCents: string;
}

const HORIZON_MONTHS = 12;

const MONTH_NAMES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function shortMonth(iso: string): string {
  const [y, m] = iso.split("-");
  const name = MONTH_NAMES[Number(m) - 1] ?? "";
  return `${name} ${y}`;
}

function brl0(reais: number): string {
  return reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function futureIso(offsetMonths: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

interface Props {
  points: TrajectoryPoint[];
  projectionInitial: PlanningProjectionPayload | null;
}

function ProjectionExtras({ data }: { data: PlanningProjectionPayload }) {
  const datedGoals = data.goals.filter((g) => g.etaLabel !== null);

  return (
    <>
      {datedGoals.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {datedGoals.map((goal) => (
            <li
              key={goal.goalId}
              className="flex items-center gap-2 text-[0.8125rem] text-[color:var(--text-secondary)]"
            >
              <Target
                size={15}
                strokeWidth={2}
                className="shrink-0 text-[color:var(--color-brand-800)]"
                aria-hidden
              />
              <span>
                <span className="font-semibold text-[color:var(--text-primary)]">{goal.title}</span>
                {", no ritmo atual, em "}
                <span className="font-semibold text-[color:var(--color-brand-800)]">
                  {goal.etaLabel}
                </span>
                .
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 border-t border-[color:var(--border-soft)] pt-3">
        <Link
          href={"/app/linha-do-tempo/relatorio" as Route}
          className="focus-ring -mx-1 mb-2 flex items-center gap-2 rounded-lg px-1 py-1.5 text-[0.8125rem] font-semibold text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
        >
          <Receipt
            size={15}
            strokeWidth={2}
            className="shrink-0 text-[color:var(--color-brand-800)]"
            aria-hidden
          />
          <span className="flex-1">Relatório do ano</span>
          <ChevronRight
            size={15}
            strokeWidth={2}
            className="shrink-0 text-[color:var(--text-muted)]"
            aria-hidden
          />
        </Link>

        <Sheet>
          <SheetTrigger className="focus-ring inline-flex items-center gap-1.5 text-[0.75rem] font-semibold text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]">
            <SlidersHorizontal size={14} strokeWidth={2} aria-hidden />
            Ajustar
          </SheetTrigger>
          <SheetContent side="bottom" className="overflow-y-auto">
            <SheetHeader className="mb-5">
              <SheetTitle>Ajustar a projeção</SheetTitle>
              <SheetDescription>
                Defina onde seu saldo da Carteira rende e a ordem das suas metas.
              </SheetDescription>
            </SheetHeader>
            <CascadeConfigPanel />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

export function PatrimonyTrajectoryChart({ points, projectionInitial }: Props) {
  const { hidden } = useMoneyVisibility();
  const { data: projection } = useSuspenseQuery({
    queryKey: ["planning", "projection"],
    queryFn: fetchPlanningProjection,
    initialData: projectionInitial,
  });

  if (points.length === 0) return null;

  if (points.length < 3) {
    const last = points[points.length - 1]!;
    return (
      <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
        <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Como você vem indo</h2>
        <div className="mt-3 flex flex-col items-center gap-1.5 py-3 text-center">
          <span className="text-[0.6875rem] text-[color:var(--text-muted)]">
            {shortMonth(last.monthIso)}
          </span>
          <span className="text-[1rem] font-bold text-[color:var(--text-primary)]">
            {hidden ? "R$ •••" : brl0(Number(last.netWorthCents) / 100)}
          </span>
          <p className="mt-1 text-[0.75rem] text-[color:var(--text-muted)]">
            {points.length === 1
              ? "Seu primeiro mês está no mapa. A curva começa a se desenhar a partir do terceiro mês."
              : "Faltam poucos dados pra curva. Mais um mês fechado e a linha de como você vem indo aparece aqui."}
          </p>
        </div>
      </section>
    );
  }

  const past: UnifiedPoint[] = points.map((p) => ({
    monthIso: p.monthIso,
    netWorthCents: p.netWorthCents,
  }));

  const hasFuture = Boolean(projection?.hasSignal);
  const futureSource = hasFuture
    ? (projection?.points ?? []).filter((p) => p.month >= 1 && p.month <= HORIZON_MONTHS)
    : [];
  const future: UnifiedPoint[] = futureSource.map((p) => ({
    monthIso: futureIso(p.month),
    netWorthCents: p.netWorthCents,
  }));

  const horizonPoint =
    futureSource.find((p) => p.month === HORIZON_MONTHS) ??
    (futureSource.length > 0 ? futureSource[futureSource.length - 1] : null);

  return (
    <section className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4">
      <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Sua trajetória</h2>

      <div className="mt-3">
        <UnifiedTrajectoryChart past={past} future={future} hidden={hidden} />
      </div>

      {future.length > 0 ? (
        <div className="mt-2 flex items-center gap-3 text-[0.625rem] text-[color:var(--text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-0.5 w-4 rounded-full bg-[color:var(--color-brand-600)]"
            />
            já aconteceu
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-0 w-4 border-t-2 border-dashed border-[color:var(--color-brand-600)]"
            />
            no ritmo atual
          </span>
        </div>
      ) : null}

      {horizonPoint ? (
        <p className="mt-3 text-[0.8125rem] text-[color:var(--text-secondary)]">
          No ritmo atual, daqui {HORIZON_MONTHS} meses por volta de{" "}
          <span className="font-semibold text-[color:var(--text-primary)]">
            {hidden ? "R$ •••" : horizonPoint.netWorthFormatted}
          </span>
          .
        </p>
      ) : (
        <div className="mt-3 flex flex-col items-start gap-2">
          <p className="text-[0.8125rem] text-[color:var(--text-muted)]">
            Diga quanto você costuma ganhar por mês e a gente mostra se, no ritmo atual, você fecha
            sobrando ou no vermelho.
          </p>
          <Link
            href={"/app/renda/nova" as Route}
            className="focus-ring inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-[color:var(--color-brand-700)] hover:underline"
          >
            Cadastrar minha renda
            <ChevronRight size={14} strokeWidth={2.25} aria-hidden />
          </Link>
        </div>
      )}

      {projection ? <ProjectionExtras data={projection} /> : null}
    </section>
  );
}
