import type { Metadata } from "next";
import type { Route } from "next";

import { fetchUserProfiles } from "../../_actions/profile-queries";
import { PageShell } from "../../_components/page-shell";

import { ProfilesManager } from "./_components/profiles-manager.client";

export const metadata: Metadata = { title: "Seus perfis" };

export default async function PerfisPage() {
  const payload = await fetchUserProfiles();

  return (
    <PageShell
      title="Seus perfis"
      description="Cada perfil tem a própria renda, dívidas e patrimônio."
      backHref={"/app/configuracoes" as Route}
    >
      {payload ? <ProfilesManager payload={payload} /> : null}
    </PageShell>
  );
}
