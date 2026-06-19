import type { Metadata } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../_components/page-shell";
import { fetchMyHouseholdGoals } from "../_actions/household-queries";

import { fetchGoalsWithProgress } from "./_actions/goal-queries";
import { GoalList } from "./_components/goal-list.client";
import { HouseholdGoalsReadonlySection } from "./_components/household-goals-readonly-section";

export const metadata: Metadata = { title: "Metas" };

export default async function MetasPage() {
  const user = await requireUser();
  const [goals, householdGoals] = await Promise.all([
    fetchGoalsWithProgress(),
    fetchMyHouseholdGoals(),
  ]);

  return (
    <PageShell title="Metas" description="Onde você quer chegar.">
      <GoalList goals={goals} isPro={user.isPro} />
      <HouseholdGoalsReadonlySection goals={householdGoals} />
    </PageShell>
  );
}
