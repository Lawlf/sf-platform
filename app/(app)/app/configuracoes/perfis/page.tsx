import type { Metadata } from "next";
import type { Route } from "next";

import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";

import { ProfilesManager } from "./_components/profiles-manager.client";

export const metadata: Metadata = { title: "Seus perfis" };

export default async function PerfisPage() {
  const user = await requireUser();
  const [profiles, activeProfileId] = await Promise.all([
    repos.profiles.listForUser(user.id),
    getActiveProfileId(),
  ]);

  return (
    <PageShell
      title="Seus perfis"
      description="Cada perfil separa um conjunto de dinheiro."
      backHref={"/app/configuracoes" as Route}
    >
      <ProfilesManager
        activeProfileId={activeProfileId}
        profiles={profiles.map((p) => ({
          id: p.id,
          type: p.type,
          displayName: p.displayName,
          isPrimary: p.isPrimary,
          taxClassification: p.taxClassification,
        }))}
      />
    </PageShell>
  );
}
