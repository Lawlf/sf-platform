import type { Metadata } from "next";
import type { Route } from "next";

import { FlairPicker } from "@/app/(app)/app/perfil/_components/flair-picker.client";
import { repos } from "@/infrastructure/container";
import { getActiveProfileId } from "@/presentation/http/middleware/active-profile";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { ConservativeLevelControl } from "../../_components/conservative-level-control.client";
import { PageShell } from "../../_components/page-shell";
import { PrefSection } from "../../perfil/acessibilidade/_components/pref-section";

export const metadata: Metadata = { title: "Estilo com dinheiro" };

export default async function EstiloPage() {
  const user = await requireUser();
  const profileId = await getActiveProfileId();
  const profile = await repos.profiles.findById(profileId);

  return (
    <PageShell
      title="Estilo com dinheiro"
      description="Como você lida com dinheiro."
      backHref={"/app/configuracoes" as Route}
    >
      <div className="divide-y divide-[color:var(--border-soft)]">
        <PrefSection
          eyebrow="Renda"
          title="Quanto contar da renda que varia"
          description="Define quanto da renda variável entra no cálculo do seu saldo livre. Não muda o valor registrado."
        >
          <ConservativeLevelControl
            current={profile?.conservativeLevel ?? "normal"}
          />
        </PrefSection>

        <PrefSection
          eyebrow="Estilo"
          title="Jeito de aparecer"
          description="É só como você aparece nas telas sociais. Não muda nada nos seus números."
        >
          <FlairPicker initialFlair={user.profileFlair} />
        </PrefSection>
      </div>
    </PageShell>
  );
}
