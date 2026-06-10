import type { Metadata } from "next";
import type { Route } from "next";

import { repos } from "@/infrastructure/container";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../../_components/page-shell";

import { ImportOfx } from "./_components/import-ofx.client";

export const metadata: Metadata = { title: "Importar extrato OFX" };

function relativeUpdate(updatedAt: Date): string {
  const days = Math.floor((Date.now() - updatedAt.getTime()) / 86_400_000);
  if (days <= 0) return "atualizada hoje";
  if (days === 1) return "atualizada ontem";
  if (days < 7) return `atualizada há ${days} dias`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? "atualizada há 1 semana" : `atualizada há ${weeks} semanas`;
  const months = Math.floor(days / 30);
  return months <= 1 ? "atualizada há 1 mês" : `atualizada há ${months} meses`;
}

export default async function ExtratoPage() {
  const user = await requireUser();

  const assets = await repos.assets.findActiveByUser(user.id);
  const connectedAccounts = assets
    .filter((a) => a.externalAccountKey != null && !a.externalAccountKey.endsWith(":reserve"))
    .map((a) => ({ label: a.label, updated: relativeUpdate(a.updatedAt) }));

  return (
    <PageShell
      title="Importar extrato"
      description="Envie um arquivo OFX exportado do seu banco. Você revisa tudo antes de confirmar."
      backHref={"/app/configuracoes/importacao-de-dados" as Route}
    >
      <ImportOfx connectedAccounts={connectedAccounts} />
    </PageShell>
  );
}
