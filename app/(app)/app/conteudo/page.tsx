import type { Metadata } from "next";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../_components/page-shell";
import { WizardScreen } from "./_components/wizard-screen";

export const metadata: Metadata = { title: "Conteúdo" };

export default async function ConteudoPage() {
  const user = await requireUser();

  if (user.isPro && user.contentDiagnosticAnswer) {
    redirect("/app/conteudo/trilha" as Route);
  }

  return (
    <PageShell
      title="Por onde a gente começa?"
      description="Uma pergunta define os próximos 30 dias de conteúdo."
    >
      <WizardScreen locked={!user.isPro} />
    </PageShell>
  );
}
