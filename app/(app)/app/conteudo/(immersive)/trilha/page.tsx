import type { Metadata } from "next";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { TrilhaHome } from "../../_components/trilha-home";
import { DIAGNOSTIC_TO_TRILHA } from "../../_lib/diagnostic-mapping";
import { findTrilha } from "../../_lib/trilhas";

export const metadata: Metadata = { title: "Trilha" };

export default async function ConteudoTrilhaPage() {
  const user = await requireUser();

  if (!user.isPro || !user.contentDiagnosticAnswer) {
    redirect("/app/conteudo" as Route);
  }

  const trilha = findTrilha(DIAGNOSTIC_TO_TRILHA[user.contentDiagnosticAnswer]);
  return <TrilhaHome trilha={trilha} />;
}
