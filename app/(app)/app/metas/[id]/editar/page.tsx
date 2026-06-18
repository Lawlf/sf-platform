import type { Metadata } from "next";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { listDebts } from "@/application/use-cases/debt/list-debts.use-case";
import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isOk } from "@/shared/errors/result";

import { PageShell } from "../../../_components/page-shell";
import { loadSimPrefill } from "../../../simular/_lib/sim-prefill";
import { fetchGoalDetail } from "../../_actions/goal-queries";
import { NewGoal } from "../../nova/_components/new-goal.client";

export const metadata: Metadata = { title: "Editar meta" };

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarMetaPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const profileId = await getActiveProfileId();

  const detail = await fetchGoalDetail(id);
  if (!detail) notFound();

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
    <PageShell title="Editar meta" backHref={`/app/metas/${id}` as Route}>
      <NewGoal
        prefill={prefill}
        debts={debtList}
        assets={assetList}
        mode="edit"
        existingGoal={detail.goal}
      />
    </PageShell>
  );
}
