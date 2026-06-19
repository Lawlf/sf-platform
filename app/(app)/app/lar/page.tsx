import type { Metadata, Route } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../_components/page-shell";
import {
  fetchHouseholdGoals,
  fetchHouseholdInsight,
  fetchHouseholdMembers,
  fetchHouseholdPendingInvites,
  fetchHouseholdSnapshot,
  fetchMyHouseholds,
  fetchMyPendingInvites,
  fetchMyShares,
} from "../_actions/household-queries";

import { CreateHouseholdForm } from "./_components/create-household-form.client";
import { HouseholdGoals } from "./_components/household-goals.client";
import { HouseholdInsightCard } from "./_components/household-insight-card";
import { HouseholdJointView } from "./_components/household-joint-view.client";
import { HouseholdPanel } from "./_components/household-panel.client";
import { MyProfileSharing } from "./_components/my-profile-sharing.client";
import { PendingInvitesPanel } from "./_components/pending-invites-panel.client";

export const metadata: Metadata = { title: "Lar" };

export default async function LarPage() {
  const user = await requireUser();

  const [households, pendingInvites] = await Promise.all([
    fetchMyHouseholds(),
    fetchMyPendingInvites(),
  ]);

  const householdData = await Promise.all(
    households.map(async (h) => {
      const [members, adminPendingInvites, myShares, snapshot, goals, insight] = await Promise.all([
        fetchHouseholdMembers(h.id),
        fetchHouseholdPendingInvites(h.id),
        fetchMyShares(h.id),
        fetchHouseholdSnapshot(h.id),
        fetchHouseholdGoals(h.id),
        fetchHouseholdInsight(h.id),
      ]);
      return {
        household: h,
        members: members ?? [],
        pendingInvites: adminPendingInvites ?? [],
        myShares,
        snapshot,
        goals: goals ?? [],
        insight,
      };
    }),
  );

  return (
    <PageShell
      title="Lar"
      description="Gerencie sua família financeira no Sabor Financeiro."
      backHref={"/app/perfil" as Route}
    >
      <PendingInvitesPanel invites={pendingInvites} />

      {householdData.map(({ household, members, pendingInvites: adminInvites, myShares, snapshot, goals, insight }) => (
        <div key={household.id} className="flex flex-col gap-4">
          <HouseholdPanel
            household={household}
            members={members}
            currentUserId={user.id}
            pendingInvites={adminInvites}
          />
          {myShares ? (
            <MyProfileSharing householdId={household.id} data={myShares} />
          ) : null}
          {snapshot ? (
            <HouseholdJointView householdId={household.id} snapshot={snapshot} />
          ) : null}
          {insight && snapshot ? (
            <HouseholdInsightCard insight={insight} snapshot={snapshot} />
          ) : null}
          <HouseholdGoals householdId={household.id} goals={goals} />
        </div>
      ))}

      {households.length === 0 ? <CreateHouseholdForm /> : null}
    </PageShell>
  );
}
