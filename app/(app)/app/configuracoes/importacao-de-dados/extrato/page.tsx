import type { Metadata } from "next";
import type { Route } from "next";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../../_components/page-shell";

import { ImportOfx } from "./_components/import-ofx.client";

export const metadata: Metadata = { title: "Importar extrato OFX" };

export default async function ExtratoPage() {
  await requireUser();

  return (
    <PageShell
      title="Importar extrato"
      description="Envie um arquivo OFX exportado do seu banco. Você revisa tudo antes de confirmar."
      backHref={"/app/configuracoes/importacao-de-dados" as Route}
    >
      <ImportOfx />
    </PageShell>
  );
}
