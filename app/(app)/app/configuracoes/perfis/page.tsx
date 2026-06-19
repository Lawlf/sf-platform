import type { Metadata } from "next";
import type { Route } from "next";

import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";

import { ProfilesManager } from "./_components/profiles-manager.client";

export const metadata: Metadata = { title: "Gerenciar perfis" };

export default async function PerfisPage() {
  const user = await requireUser();
  const profiles = await repos.profiles.listForUser(user.id);

  return (
    <PageShell
      title="Gerenciar perfis"
      description="Crie, renomeie ou exclua perfis separados por contexto."
      backHref={"/app/configuracoes" as Route}
    >
      <ProfilesManager
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
