import { Calculator, Plus } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { fetchMyHouseholdGoals } from "../_actions/household-queries";
import { HowItWorksSheet } from "../_components/how-it-works-sheet";
import { PageShell } from "../_components/page-shell";

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
    <PageShell
      title="Metas"
      description="Onde você quer chegar."
      headerAction={
        <div className="flex items-center gap-2">
          <HowItWorksSheet
            topic="metas"
            variant="brand"
            actions={[
              {
                icon: <Calculator size={18} strokeWidth={2} aria-hidden />,
                label: "Simuladores de metas",
                href: "/app/simular?category=patrimonio" as Route,
              },
            ]}
          />
          <Link
            href={"/app/metas/nova" as Route}
            className="focus-ring flex items-center gap-1.5 rounded-xl bg-[color:var(--color-brand-500)] px-3.5 py-2 text-[0.8125rem] font-bold text-white shadow-[0_2px_8px_rgba(239,122,26,0.3)] transition-colors hover:bg-[color:var(--color-brand-600)]"
          >
            <Plus size={16} strokeWidth={2.5} aria-hidden />
            Nova
          </Link>
        </div>
      }
    >
      <GoalList goals={goals} isPro={user.isPro} />
      <HouseholdGoalsReadonlySection goals={householdGoals} />
    </PageShell>
  );
}
