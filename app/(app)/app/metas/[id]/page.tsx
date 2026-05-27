import type { Metadata } from "next";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { DrizzleGoalSnapshotRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-goal-snapshot.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { fetchGoalDetail } from "../_actions/goal-queries";

import { GoalDetail } from "./_components/goal-detail.client";

export const metadata: Metadata = { title: "Detalhe da meta" };

// Dynamic because we upsert a snapshot on each load.
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GoalDetailPage({ params }: Props) {
  await requireUser();

  const { id } = await params;
  const detail = await fetchGoalDetail(id);

  if (!detail) {
    notFound();
  }

  // On-open snapshot refresh: upsert current-month data point so the curve stays fresh.
  try {
    const now = new Date();
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const snapshotRepo = new DrizzleGoalSnapshotRepository();
    await snapshotRepo.upsert({
      goalId: detail.goal.id,
      month,
      currentCents: BigInt(detail.progress.currentCents),
      targetCents: BigInt(detail.progress.targetCents),
      capturedAt: now,
    });
  } catch {
    // Write failure must never break the page render.
  }

  return (
    <PageShell title={detail.goal.title} backHref={"/app/metas" as Route}>
      <GoalDetail detail={detail} />
    </PageShell>
  );
}
