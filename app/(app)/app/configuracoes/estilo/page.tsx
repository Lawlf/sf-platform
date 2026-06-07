import type { Metadata } from "next";
import type { Route } from "next";

import { FlairPicker } from "@/app/(app)/app/perfil/_components/flair-picker.client";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";

export const metadata: Metadata = { title: "Estilo financeiro" };

export default async function EstiloPage() {
  const user = await requireUser();
  return (
    <PageShell
      title="Estilo financeiro"
      description="Como você lida com dinheiro. Auto-declarado, não é recomendação de investimento."
      backHref={"/app/configuracoes" as Route}
    >
      <FlairPicker initialFlair={user.profileFlair} />
    </PageShell>
  );
}
