"use client";

import { ChevronDown, ChevronUp, TrendingDown, TrendingUp, Wallet, Users } from "lucide-react";
import { useState, useTransition } from "react";
import type { ReactNode } from "react";

import { Spinner } from "@/app/components/ui/spinner";
import type {
  HouseholdSnapshotPayload,
  SerializedContribution,
  SharedProfileDetailPayload,
} from "../../_actions/household-queries";
import { fetchSharedProfileDetail } from "../../_actions/household-queries";

interface Props {
  householdId: string;
  snapshot: HouseholdSnapshotPayload;
}

function frequencyLabel(frequency: string): string {
  if (frequency === "monthly") return "mensal";
  if (frequency === "weekly") return "semanal";
  if (frequency === "one_off") return "avulso";
  return frequency;
}

interface ProfileDetailRowProps {
  householdId: string;
  contribution: SerializedContribution;
}

function ProfileDetailRow({ householdId, contribution }: ProfileDetailRowProps) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<SharedProfileDetailPayload | null>(null);
  const [pending, startTransition] = useTransition();

  const name = contribution.displayName ?? "Perfil";

  function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (detail) return;
    startTransition(async () => {
      const data = await fetchSharedProfileDetail(householdId, contribution.profileId);
      setDetail(data);
    });
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-4 py-3">
        <Users size={15} strokeWidth={2} className="shrink-0 text-[color:var(--text-muted)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
            {name}
          </span>
          <span className="text-[0.75rem] text-[color:var(--text-muted)]">
            contribui {contribution.incomeBrl}
          </span>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={pending}
          className="focus-ring flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[0.6875rem] font-semibold text-[color:var(--color-brand-800)] hover:bg-[color:var(--color-brand-500)]/[0.10]"
          aria-expanded={open ? "true" : "false"}
        >
          {pending ? (
            <Spinner size={12} decorative className="text-[color:var(--text-muted)]" />
          ) : open ? (
            <>
              Fechar
              <ChevronUp size={12} aria-hidden />
            </>
          ) : (
            <>
              Ver detalhe
              <ChevronDown size={12} aria-hidden />
            </>
          )}
        </button>
      </div>

      {open && detail ? (
        <div className="mt-1 flex flex-col gap-1 pl-4">
          {detail.incomes.length > 0 ? (
            <div className="flex flex-col gap-1">
              <h5 className="mt-1 text-[0.75rem] font-semibold text-[color:var(--text-muted)]">
                Rendas
              </h5>
              {detail.incomes.map((inc) => (
                <div
                  key={inc.id}
                  className="flex items-center gap-2 px-1 py-1"
                >
                  <TrendingUp size={13} strokeWidth={2} className="shrink-0 text-[color:var(--semantic-positive,#16a34a)]" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-[color:var(--text-primary)]">
                    {inc.label}
                    {inc.isEstimated ? (
                      <span className="ml-1 text-[0.6875rem] text-[color:var(--text-muted)]">(estimado)</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[0.8125rem] tabular-nums text-[color:var(--text-primary)]">
                    {inc.amountBrl}
                    <span className="ml-1 text-[0.6875rem] font-normal text-[color:var(--text-muted)]">
                      / {frequencyLabel(inc.frequency)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {detail.debts.length > 0 ? (
            <div className="flex flex-col gap-1">
              <h5 className="mt-1 text-[0.75rem] font-semibold text-[color:var(--text-muted)]">
                Dívidas ativas
              </h5>
              {detail.debts.map((debt) => (
                <div
                  key={debt.id}
                  className="flex items-center gap-2 px-1 py-1"
                >
                  <TrendingDown size={13} strokeWidth={2} className="shrink-0 text-[color:var(--semantic-negative)]" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-[color:var(--text-primary)]">
                    {debt.label}
                  </span>
                  <span className="shrink-0 text-[0.8125rem] tabular-nums text-[color:var(--semantic-negative)]">
                    {debt.balanceBrl}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {detail.incomes.length === 0 && detail.debts.length === 0 ? (
            <p className="text-[0.8125rem] text-[color:var(--text-muted)]">
              Nenhum registro compartilhado.
            </p>
          ) : null}
        </div>
      ) : null}

      {open && !detail && !pending ? (
        <p className="pl-4 pt-1 text-[0.8125rem] text-[color:var(--text-muted)]">
          Não foi possível carregar os detalhes.
        </p>
      ) : null}
    </div>
  );
}

interface AggregateRowProps {
  contribution: SerializedContribution;
}

function AggregateRow({ contribution }: AggregateRowProps) {
  const name = contribution.displayName ?? "Perfil";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] px-4 py-3">
      <Users size={15} strokeWidth={2} className="shrink-0 text-[color:var(--text-muted)]" aria-hidden />
      <div className="min-w-0 flex-1">
        <span className="block truncate text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
          {name}
        </span>
        <span className="text-[0.75rem] text-[color:var(--text-muted)]">
          contribui {contribution.incomeBrl}
        </span>
      </div>
    </div>
  );
}

function CollapsibleContributions({
  householdId,
  contributions,
}: {
  householdId: string;
  contributions: SerializedContribution[];
}): ReactNode {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="focus-ring flex items-center justify-between rounded-lg px-1 py-1 text-[0.75rem] font-semibold text-[color:var(--color-brand-800)] hover:opacity-80"
        aria-expanded={open ? "true" : "false"}
      >
        <span>Ver quem contribui</span>
        {open ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
      </button>
      {open ? (
        <div className="flex flex-col gap-1 pt-1">
          {contributions.map((c) =>
            c.shareLevel === "detail" ? (
              <ProfileDetailRow key={c.profileId} householdId={householdId} contribution={c} />
            ) : (
              <AggregateRow key={c.profileId} contribution={c} />
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

export function HouseholdJointView({ householdId, snapshot }: Props) {
  const hasContributions = snapshot.contributions.length > 0;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-5 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
          <Wallet size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[color:var(--text-primary)]">Totais da casa</h2>
          <span className="text-[0.75rem] text-[color:var(--text-muted)]">
            Soma dos perfis compartilhados
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-0.5 rounded-xl bg-[color:var(--surface-2)] px-3 py-2.5">
          <span className="text-[0.6875rem] text-[color:var(--text-muted)]">
            Renda
          </span>
          <span className="text-[0.9375rem] font-bold tabular-nums text-[color:var(--text-primary)]">
            {snapshot.totalIncomeBrl}
          </span>
        </div>

        <div className="flex flex-col gap-0.5 rounded-xl bg-[color:var(--surface-2)] px-3 py-2.5">
          <span className="text-[0.6875rem] text-[color:var(--text-muted)]">
            Parcelas/mês
          </span>
          <span className="text-[0.9375rem] font-bold tabular-nums text-[color:var(--text-primary)]">
            {snapshot.totalMonthlyServiceBrl}
          </span>
        </div>

        <div className="flex flex-col gap-0.5 rounded-xl bg-[color:var(--surface-2)] px-3 py-2.5">
          <span className="text-[0.6875rem] text-[color:var(--text-muted)]">
            Patrimônio
          </span>
          <span className="text-[0.9375rem] font-bold tabular-nums text-[color:var(--text-primary)]">
            {snapshot.netWorthBrl}
          </span>
        </div>
      </div>

      <p className="text-[0.6875rem] text-[color:var(--text-muted)]">
        Cada um edita no próprio perfil.
      </p>

      {hasContributions ? (
        <CollapsibleContributions householdId={householdId} contributions={snapshot.contributions} />
      ) : (
        <p className="text-center text-[0.875rem] text-[color:var(--text-muted)]">
          Nenhum perfil compartilhado neste lar ainda.
        </p>
      )}
    </section>
  );
}
