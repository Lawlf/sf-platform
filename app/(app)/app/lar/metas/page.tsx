import type { Metadata, Route } from "next";
import { Target } from "lucide-react";

import { PageShell } from "../../_components/page-shell";
import {
  fetchHouseholdGoals,
  fetchHouseholdMembers,
  fetchMyHouseholds,
} from "../../_actions/household-queries";

import { HouseholdContextHeader } from "../_components/household-context-header";
import { HouseholdGoals } from "../_components/household-goals.client";

export const metadata: Metadata = { title: "Metas da família" };

export default async function LarMetasPage() {
  const households = await fetchMyHouseholds();

  const householdData = await Promise.all(
    households.map(async (h) => {
      const [members, goals] = await Promise.all([
        fetchHouseholdMembers(h.id),
        fetchHouseholdGoals(h.id),
      ]);
      return {
        household: h,
        members: members ?? [],
        goals: goals ?? [],
      };
    }),
  );

  return (
    <PageShell
      title="Metas da família"
      description="Objetivos que todos podem ajudar a construir."
      backHref={"/app/lar" as Route}
    >
      {householdData.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--color-brand-500)]/[0.14] text-[color:var(--color-brand-800)]">
            <Target size={22} strokeWidth={1.75} aria-hidden />
          </span>
          <p className="text-[0.875rem] text-[color:var(--text-muted)]">
            Você ainda não faz parte de um lar. Crie ou entre em um para definir metas em conjunto.
          </p>
        </div>
      ) : (
        householdData.map(({ household, members, goals }) => (
          <div key={household.id} className="flex flex-col gap-4">
            <HouseholdContextHeader household={household} members={members} mode="view" />
            <HouseholdGoals householdId={household.id} goals={goals} />
          </div>
        ))
      )}
    </PageShell>
  );
}
