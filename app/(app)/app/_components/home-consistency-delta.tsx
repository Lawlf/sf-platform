import { TrendingUp } from "lucide-react";

import type { ConsistencyDelta } from "@/domain/services/consistency.service";

import { HideableValue } from "./money-visibility/hideable-value.client";

function brl(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function line(delta: ConsistencyDelta): { lead: string; value: string } | null {
  const { lever, amountCents, pointsBps, sinceLabel } = delta;
  if (lever === "committed") {
    if (pointsBps === null) return null;
    return {
      lead: `Desde ${sinceLabel}, seu comprometido caiu`,
      value: `${(pointsBps / 100).toFixed(0)} pontos`,
    };
  }
  if (amountCents === null) return null;
  const lead =
    lever === "debt"
      ? `Desde ${sinceLabel}, você já abateu`
      : lever === "reserve"
        ? `Desde ${sinceLabel}, sua reserva subiu`
        : `Desde ${sinceLabel}, seu patrimônio subiu`;
  return { lead, value: brl(amountCents) };
}

/**
 * Fio de progresso material (nao vaidade): mostra o quanto mudou de verdade
 * (divida abatida / reserva / patrimonio) desde o primeiro fechamento. So aparece
 * com progresso POSITIVO; mes ruim nao vira deboche. Reusa o delta ja calculado
 * pelo getConsistencyCard (que exige 2+ fechamentos).
 */
export function HomeConsistencyDelta({ delta }: { delta: ConsistencyDelta | null }) {
  if (!delta || delta.direction !== "positive") return null;
  const content = line(delta);
  if (!content) return null;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--semantic-positive)]/30 bg-[color:var(--semantic-positive)]/[0.08] px-[18px] py-[14px]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--semantic-positive)]/[0.16] text-[color:var(--semantic-positive)]">
        <TrendingUp size={18} strokeWidth={2} aria-hidden />
      </span>
      <p className="text-[0.875rem] leading-snug text-[color:var(--text-primary)]">
        {content.lead}{" "}
        <span className="font-bold text-[color:var(--semantic-positive)]">
          <HideableValue>{content.value}</HideableValue>
        </span>
        . O mês oscila, o acumulado conta a história.
      </p>
    </div>
  );
}
