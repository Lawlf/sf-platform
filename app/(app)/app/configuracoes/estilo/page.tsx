import type { Metadata } from "next";
import type { Route } from "next";

import { FlairPicker } from "@/app/(app)/app/perfil/_components/flair-picker.client";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";

export const metadata: Metadata = { title: "Estilo com dinheiro" };

export default async function EstiloPage() {
  const user = await requireUser();
  return (
    <PageShell
      title="Estilo com dinheiro"
      description="Como você lida com dinheiro. Não muda nada nas suas contas, é só como você aparece."
      backHref={"/app/configuracoes" as Route}
    >
      <FlairPicker initialFlair={user.profileFlair} />
    </PageShell>
  );
}
