import type { Metadata } from "next";
import type { Route } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";

import { RegionPreferences } from "./_components/region-preferences.client";

export const metadata: Metadata = { title: "Idioma e região" };

export default async function IdiomaRegiaoPage() {
  const user = await requireUser();
  return (
    <PageShell
      title="Idioma e região"
      description="Por enquanto o app é em português (Brasil). Você pode escolher a moeda padrão dos seus lançamentos."
      backHref={"/app/configuracoes" as Route}
    >
      <RegionPreferences current={user.baseCurrency} />
    </PageShell>
  );
}
