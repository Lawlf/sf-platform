import type { Metadata } from "next";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { getTrilhaProgress } from "@/application/use-cases/content/get-trilha-progress.use-case";
import { DrizzleModuleProgressRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-module-progress.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { fetchPrescription } from "../../../_actions/prescription-queries";
import { TrilhaHome } from "../../_components/trilha-home";
import { suggestContent } from "../../_lib/content-suggestion";
import { DIAGNOSTIC_TO_TRILHA } from "../../_lib/diagnostic-mapping";
import { findTrilha } from "../../_lib/trilhas";

export const metadata: Metadata = { title: "Trilha" };

export default async function ConteudoTrilhaPage() {
  const user = await requireUser();
  if (!user.isPro || !user.contentDiagnosticAnswer) {
    redirect("/app/conteudo" as Route);
  }

  const trilha = findTrilha(DIAGNOSTIC_TO_TRILHA[user.contentDiagnosticAnswer]);
  const { completedNums } = await getTrilhaProgress(
    { progress: new DrizzleModuleProgressRepository() },
    { userId: user.id, trilhaSlug: trilha.slug },
  );

  const presc = await fetchPrescription();
  const suggestion = suggestContent(presc?.prescription ?? null);
  const suggestedHere = suggestion?.trilhaSlug === trilha.slug;

  return <TrilhaHome trilha={trilha} completedNums={completedNums} suggestedHere={suggestedHere} />;
}
