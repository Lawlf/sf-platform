import type { Metadata, Route } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../_components/page-shell";
import {
  fetchHouseholdMembers,
  fetchHouseholdPendingInvites,
  fetchMyHouseholds,
  fetchMyPendingInvites,
} from "../_actions/household-queries";

import { CreateHouseholdForm } from "./_components/create-household-form.client";
import { HouseholdPanel } from "./_components/household-panel.client";
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
      const [members, adminPendingInvites] = await Promise.all([
        fetchHouseholdMembers(h.id),
        fetchHouseholdPendingInvites(h.id),
      ]);
      return { household: h, members: members ?? [], pendingInvites: adminPendingInvites ?? [] };
    }),
  );

  return (
    <PageShell
      title="Lar"
      description="Gerencie sua família financeira no Sabor Financeiro."
      backHref={"/app/perfil" as Route}
    >
      <PendingInvitesPanel invites={pendingInvites} />

      {householdData.map(({ household, members, pendingInvites: adminInvites }) => (
        <HouseholdPanel
          key={household.id}
          household={household}
          members={members}
          currentUserId={user.id}
          pendingInvites={adminInvites}
        />
      ))}

      {households.length === 0 ? <CreateHouseholdForm /> : null}
    </PageShell>
  );
}
