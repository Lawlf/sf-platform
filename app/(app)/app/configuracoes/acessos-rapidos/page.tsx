import type { Metadata } from "next";
import type { Route } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { QUICK_ACCESS_CATALOG, resolveQuickAccess } from "../../_components/quick-access/catalog";
import { PrefSection } from "../../perfil/acessibilidade/_components/pref-section";

import { QuickAccessEditor } from "./_components/quick-access-editor.client";

export const metadata: Metadata = { title: "Acessos rápidos" };

export default async function AcessosRapidosPage() {
  const user = await requireUser();
  const initialKeys = resolveQuickAccess(user.quickAccess).map((e) => e.key);

  return (
    <PageShell
      title="Acessos rápidos"
      description="Escolha os atalhos que aparecem na sua home."
      backHref={"/app/configuracoes" as Route}
    >
      <PrefSection
        eyebrow="Home"
        title="Seus atalhos"
        description="Adicione, remova e ordene até 8 atalhos. Eles aparecem no topo da home."
      >
        <QuickAccessEditor
          isPro={user.isPro}
          initialKeys={initialKeys}
          catalog={QUICK_ACCESS_CATALOG}
        />
      </PrefSection>
    </PageShell>
  );
}
