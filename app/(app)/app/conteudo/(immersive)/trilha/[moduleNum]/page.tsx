import type { Metadata } from "next";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { fetchPrescription } from "../../../../_actions/prescription-queries";
import { BeatPlayer } from "../../../_components/beat-player.client";
import { CompleteModuleButton } from "../../../_components/complete-module-button.client";
import { ImmersiveReader } from "../../../_components/immersive-reader.client";
import { ModuleReader } from "../../../_components/module-reader";
import type { ResolvedQuiz, ResolvedQuizOption } from "../../../_components/quiz-checkpoint.client";
import { audioPublicUrl } from "../../../_lib/audio-url";
import { suggestContent } from "../../../_lib/content-suggestion";
import { DIAGNOSTIC_TO_TRILHA } from "../../../_lib/diagnostic-mapping";
import { loadModuleDoc, type QuizFm } from "../../../_lib/module-doc";
import { findModuleBeats } from "../../../_lib/module-registry";
import { findTrilha } from "../../../_lib/trilhas";

export const metadata: Metadata = { title: "Módulo" };

function resolveQuiz(quiz: QuizFm[] | undefined, targetDebtLabel: string | undefined): ResolvedQuiz[] {
  if (!quiz) return [];
  const label = targetDebtLabel ?? "sua dívida mais cara";
  return quiz.map((q) => ({
    prompt: q.prompt.replace("{targetDebtLabel}", label),
    options: q.options.map((o) => {
      const option: ResolvedQuizOption = { label: o.label, correct: o.correct };
      if (o.feedback !== undefined) option.feedback = o.feedback;
      return option;
    }),
  }));
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ moduleNum: string }>;
}) {
  const user = await requireUser();
  if (!user.isPro || !user.contentDiagnosticAnswer) {
    redirect("/app/conteudo" as Route);
  }

  const trilha = findTrilha(DIAGNOSTIC_TO_TRILHA[user.contentDiagnosticAnswer]);
  const { moduleNum } = await params;
  const num = Number(moduleNum);
  const moduleSpec = trilha.modules.find((m) => m.num === num);
  if (!moduleSpec || moduleSpec.status !== "ready") {
    redirect("/app/conteudo/trilha" as Route);
  }

  const readyNums = trilha.modules.filter((m) => m.status === "ready").map((m) => m.num);
  const isLastOfTrilha = readyNums.length > 0 && num === Math.max(...readyNums);

  const moduleBeats = findModuleBeats(trilha.slug, num);
  if (moduleBeats) {
    const beatAudio = audioPublicUrl(moduleBeats.audio);
    const prevNum = readyNums.filter((n) => n < num).sort((a, b) => b - a)[0] ?? null;
    const nextNum = readyNums.filter((n) => n > num).sort((a, b) => a - b)[0] ?? null;
    return (
      <BeatPlayer
        trilhaSlug={trilha.slug}
        num={num}
        audioSrc={beatAudio}
        prevNum={prevNum}
        nextNum={nextNum}
      />
    );
  }

  const doc = await loadModuleDoc(trilha.slug, num);
  if (!doc) {
    redirect("/app/conteudo/trilha" as Route);
  }

  const presc = await fetchPrescription();
  const suggestion = suggestContent(presc?.prescription ?? null);
  const quiz = resolveQuiz(doc.frontmatter.quiz, suggestion?.contextLabels.targetDebtLabel);

  return (
    <ImmersiveReader chapterLabel={`Capítulo ${String(num).padStart(2, "0")}`}>
      <ModuleReader frontmatter={doc.frontmatter} body={doc.body} quiz={quiz} />
      <CompleteModuleButton moduleNum={num} isLastOfTrilha={isLastOfTrilha} />
    </ImmersiveReader>
  );
}
