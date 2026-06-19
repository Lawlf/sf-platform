import { AlertCircle, CheckCircle2, Users } from "lucide-react";

import { HideableValue } from "@/app/(app)/app/_components/money-visibility/hideable-value.client";
import type {
  HouseholdGapMemberPayload,
  HouseholdGapPayload,
} from "../../_actions/household-queries";

interface Props {
  gap: HouseholdGapPayload;
}

function brlIsZero(formatted: string): boolean {
  return /^R\$\s*0[,.]?0*$/.test(formatted.trim());
}

function resolveDisplayName(member: HouseholdGapMemberPayload): string {
  return member.displayName ?? "Membro";
}

function memberHasActivity(member: HouseholdGapMemberPayload): boolean {
  return !brlIsZero(member.jaRecebidoBrl) || !brlIsZero(member.aReceberConfirmadoBrl);
}

function buildSplitLabel(porMembro: HouseholdGapMemberPayload[]): string | null {
  const withSuggestion = porMembro.filter((m) => m.suggestedShareBrl !== null);
  if (withSuggestion.length < 2) return null;
  const parts = withSuggestion
    .map((m) => `${resolveDisplayName(m)} ~${m.suggestedShareBrl}`)
    .join(", ");
  return `Pra cobrir, proporcional à renda: ${parts}. Vocês decidem.`;
}

export function HouseholdGapHero({ gap }: Props) {
  const gapCentsNum = BigInt(gap.gapCents);
  const covered = gapCentsNum <= 0n;
  const showEstimado = !brlIsZero(gap.aReceberEstimadoBrl);
  const activeMembers = gap.porMembro.filter(memberHasActivity);
  const splitLabel = covered ? null : buildSplitLabel(gap.porMembro);

  return (
    <section
      aria-label="Sobra ou falta do mês da casa"
      className={`flex flex-col gap-4 rounded-2xl border p-5 ${
        covered
          ? "border-[color:var(--semantic-positive,#16a34a)]/30 bg-[color:var(--semantic-positive,#16a34a)]/[0.04]"
          : "border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/[0.04]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            covered
              ? "bg-[color:var(--semantic-positive,#16a34a)]/[0.12] text-[color:var(--semantic-positive,#16a34a)]"
              : "bg-[color:var(--semantic-negative)]/[0.12] text-[color:var(--semantic-negative)]"
          }`}
        >
          {covered ? (
            <CheckCircle2 size={18} strokeWidth={1.75} aria-hidden />
          ) : (
            <AlertCircle size={18} strokeWidth={1.75} aria-hidden />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={`text-[0.75rem] font-semibold ${
              covered
                ? "text-[color:var(--semantic-positive,#16a34a)]"
                : "text-[color:var(--semantic-negative)]"
            }`}
          >
            {covered ? "Mês coberto" : "Falta garantir"}
          </p>
          <p className="mt-0.5 text-[1.75rem] font-bold leading-none tabular-nums tracking-tight text-[color:var(--text-primary)]">
            <HideableValue>{gap.gapBrl}</HideableValue>
          </p>
          <p className="mt-1.5 text-[0.8125rem] text-[color:var(--text-secondary)]">
            {covered
              ? "A casa fechou o mês — sobra " + gap.gapBrl
              : "Faltam " + gap.gapBrl + " pra fechar o mês"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 rounded-xl bg-[color:var(--surface-2)] px-4 py-3">
        <p className="text-[0.75rem] text-[color:var(--text-muted)]">
          <span className="font-medium text-[color:var(--text-secondary)]">Custos</span>{" "}
          <HideableValue>{gap.custosGarantidosBrl}</HideableValue>
          {" · "}
          <span className="font-medium text-[color:var(--text-secondary)]">já entrou</span>{" "}
          <HideableValue>{gap.jaRecebidoBrl}</HideableValue>
          {" · "}
          <span className="font-medium text-[color:var(--text-secondary)]">a receber</span>{" "}
          <HideableValue>{gap.aReceberConfirmadoBrl}</HideableValue>
        </p>

        {showEstimado ? (
          <p className="text-[0.6875rem] text-[color:var(--text-muted)]">
            + <HideableValue>{gap.aReceberEstimadoBrl}</HideableValue> estimado (não garantido)
          </p>
        ) : null}
      </div>

      {activeMembers.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-[0.75rem] font-semibold text-[color:var(--text-muted)]">
            Contribuição por membro
          </p>
          <div className="flex flex-col gap-1.5">
            {activeMembers.map((pm) => {
              const name = resolveDisplayName(pm);
              const showRecebido = !brlIsZero(pm.jaRecebidoBrl);
              const showAReceber = !brlIsZero(pm.aReceberConfirmadoBrl);

              return (
                <div
                  key={pm.profileId}
                  className="flex items-center gap-2 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-3 py-2"
                >
                  <Users
                    size={13}
                    strokeWidth={2}
                    className="shrink-0 text-[color:var(--text-muted)]"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-[color:var(--text-primary)]">
                    {name}
                  </span>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    {showRecebido ? (
                      <span className="text-[0.75rem] tabular-nums text-[color:var(--text-secondary)]">
                        <HideableValue>{pm.jaRecebidoBrl}</HideableValue>
                        <span className="ml-1 text-[0.6875rem] text-[color:var(--text-muted)]">
                          recebido
                        </span>
                      </span>
                    ) : null}
                    {showAReceber ? (
                      <span className="text-[0.75rem] tabular-nums text-[color:var(--text-secondary)]">
                        <HideableValue>{pm.aReceberConfirmadoBrl}</HideableValue>
                        <span className="ml-1 text-[0.6875rem] text-[color:var(--text-muted)]">
                          a receber
                        </span>
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {splitLabel ? (
        <p className="text-[0.6875rem] text-[color:var(--text-muted)]">{splitLabel}</p>
      ) : null}

      <p className="text-[0.6875rem] text-[color:var(--text-muted)]">
        Só renda confirmada conta no gap. Estimado fica à parte.
      </p>
    </section>
  );
}
