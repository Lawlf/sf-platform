import type { Metadata, Route } from "next";

import { PageShell } from "../_components/page-shell";
import {
  fetchHouseholdGoals,
  fetchHouseholdInsight,
  fetchHouseholdMembers,
  fetchHouseholdSnapshot,
  fetchMyHouseholds,
  fetchMyPendingInvites,
} from "../_actions/household-queries";

import { CreateHouseholdForm } from "./_components/create-household-form.client";
import { HouseholdContextHeader } from "./_components/household-context-header";
import { HouseholdFeaturedGoal, HouseholdGoalsTeaser } from "./_components/household-goals.client";
import { HouseholdInsightCard } from "./_components/household-insight-card";
import { HouseholdJointEmpty } from "./_components/household-joint-empty";
import { HouseholdJointView } from "./_components/household-joint-view.client";
import { HouseholdPaywallCard } from "./_components/household-paywall-card";
import { PendingInvitesPanel } from "./_components/pending-invites-panel.client";

export const metadata: Metadata = { title: "Nosso lar" };

export default async function LarPage() {
  const [households, pendingInvites] = await Promise.all([
    fetchMyHouseholds(),
    fetchMyPendingInvites(),
  ]);

  const householdData = await Promise.all(
    households.map(async (h) => {
      const [members, snapshot, insight, goals] = await Promise.all([
        fetchHouseholdMembers(h.id),
        fetchHouseholdSnapshot(h.id),
        fetchHouseholdInsight(h.id),
        fetchHouseholdGoals(h.id),
      ]);
      return {
        household: h,
        members: members ?? [],
        snapshot,
        insight,
        goals: goals ?? [],
      };
    }),
  );

  return (
    <PageShell
      title="Nosso lar"
      description="A vida financeira de quem divide as contas com você, numa visão só. Você escolhe o que cada um vê."
      backHref={"/app/perfil" as Route}
    >
      <PendingInvitesPanel invites={pendingInvites} />

      {householdData.map(({ household, members, snapshot, insight, goals }) => (
        <div key={household.id} className="flex flex-col gap-4">
          <HouseholdContextHeader household={household} members={members} mode="view" />

          {snapshot && !snapshot.gated ? (
            <>
              {insight ? (
                <HouseholdInsightCard insight={insight} snapshot={snapshot.snapshot} />
              ) : null}
              <HouseholdJointView householdId={household.id} snapshot={snapshot.snapshot} />
            </>
          ) : null}
          {snapshot && snapshot.gated && snapshot.hasData ? <HouseholdPaywallCard /> : null}
          {snapshot && snapshot.gated && !snapshot.hasData ? <HouseholdJointEmpty /> : null}

          {goals.length > 0 && goals[0] ? (
            <HouseholdFeaturedGoal
              householdId={household.id}
              goal={goals[0]}
            />
          ) : (
            <HouseholdGoalsTeaser householdId={household.id} />
          )}
        </div>
      ))}

      {households.length === 0 ? <CreateHouseholdForm /> : null}
    </PageShell>
  );
}
