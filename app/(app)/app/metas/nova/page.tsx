import { ArrowRight, Crown } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { listDebts } from "@/application/use-cases/debt/list-debts.use-case";
import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { PageShell } from "../../_components/page-shell";
import { parseGoalSeed } from "../../simular/_lib/goal-seed";
import { loadSimPrefill } from "../../simular/_lib/sim-prefill";
import { fetchGoalsWithProgress } from "../_actions/goal-queries";

import { NewGoal } from "./_components/new-goal.client";

export const metadata: Metadata = { title: "Nova meta" };

export default async function NovaMetaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const seed = parseGoalSeed(sp);
  const user = await requireUser();
  const profileId = await getActiveProfileId();

  // Free plan: block if already has >= 1 active goal
  if (!user.isPro) {
    const goals = await fetchGoalsWithProgress();
    const activeCount = goals.filter((g) => g.goal.status === "active").length;
    if (activeCount >= 1) {
      return (
        <PageShell title="Nova meta" backHref={"/app/metas" as Route}>
          <section
            className="relative overflow-hidden rounded-[18px] border border-[color:var(--color-brand-500)]/30 bg-[color:var(--surface-1)] p-5 backdrop-blur-xl"
            style={{
              backgroundImage:
                "radial-gradient(circle at 100% 0%, rgba(242,142,37,0.16), transparent 60%)",
            }}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <span
                className="grid h-9 w-9 place-items-center rounded-[10px] text-white"
                style={{
                  background: "linear-gradient(135deg,#f28e25,#ef7a1a)",
                  boxShadow: "0 8px 18px -6px rgba(239,122,26,0.55)",
                }}
              >
                <Crown size={18} strokeWidth={2.2} aria-hidden />
              </span>
              <div>
                <div className="text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[color:var(--color-brand-800)]">
                  Recurso Pro
                </div>
                <div className="text-[0.9375rem] font-bold tracking-[-0.01em] text-[color:var(--text-primary)]">
                  Múltiplas metas simultâneas
                </div>
              </div>
            </div>
            <p className="mb-4 text-[0.78125rem] leading-[1.5] text-[color:var(--text-secondary)]">
              No plano gratuito você pode ter uma meta ativa por vez. Assine o Pro e acompanhe todos
              os seus objetivos em paralelo.
            </p>
            <Link
              href={"/app/configuracoes/planos" as Route}
              className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] px-5 py-3 text-[0.84375rem] font-bold text-white"
              style={{ boxShadow: "0 10px 24px -8px rgba(239,122,26,0.5)" }}
            >
              Virar Pro
              <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
            </Link>
          </section>
        </PageShell>
      );
    }
  }

  const [prefill, debtList, assetList] = await Promise.all([
    loadSimPrefill(user.id),
    (async () => {
      const r = await listDebts(
        { debts: repos.debts },
        { profileId, status: "active" },
      );
      if (!isOk(r)) return [];
      return r.value.map((d) => ({
        id: d.id,
        label: d.label,
        balanceCents: d.currentBalance.toCents().toString(),
      }));
    })(),
    (async () => {
      const repo = repos.assets;
      const assets = await repo.findActiveByUser(user.id);
      return assets
        .filter((a) => a.category === "cash" || a.category === "investment")
        .map((a) => ({
          id: a.id,
          label: a.label,
          category: a.category,
          valueCents: a.currentValue.toCents().toString(),
        }));
    })(),
  ]);

  return (
    <PageShell title="Nova meta" backHref={"/app/metas" as Route}>
      <NewGoal prefill={prefill} debts={debtList} assets={assetList} seed={seed} />
    </PageShell>
  );
}
