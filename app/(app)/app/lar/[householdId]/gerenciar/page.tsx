import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../../_components/page-shell";
import {
  fetchHouseholdMembers,
  fetchHouseholdPendingInvites,
  fetchMyHouseholds,
  fetchMyShares,
} from "../../../_actions/household-queries";
import { HouseholdContextHeader } from "../../_components/household-context-header";
import { HouseholdPanel } from "../../_components/household-panel.client";
import { MyProfileSharing } from "../../_components/my-profile-sharing.client";

export const metadata: Metadata = { title: "Gerenciar lar" };

export default async function GerenciarLarPage({
  params,
}: {
  params: Promise<{ householdId: string }>;
}) {
  const { householdId } = await params;
  const user = await requireUser();

  const households = await fetchMyHouseholds();
  const household = households.find((h) => h.id === householdId);
  if (!household) notFound();

  const [members, pendingInvites, myShares] = await Promise.all([
    fetchHouseholdMembers(householdId),
    fetchHouseholdPendingInvites(householdId),
    fetchMyShares(householdId),
  ]);

  return (
    <PageShell title={household.name} backHref={"/app/lar" as Route}>
      <HouseholdContextHeader household={household} members={members ?? []} mode="manage" />
      <HouseholdPanel
        household={household}
        members={members ?? []}
        currentUserId={user.id}
        pendingInvites={pendingInvites ?? []}
      />
      {myShares ? <MyProfileSharing householdId={householdId} data={myShares} /> : null}
    </PageShell>
  );
}
