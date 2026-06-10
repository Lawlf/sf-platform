"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { saveDiagnosticAnswer } from "@/application/use-cases/user/save-diagnostic-answer.use-case";
import type { ContentDiagnosticAnswer } from "@/domain/entities/user.entity";
import { repos } from "@/infrastructure/container";
import { action } from "@/presentation/actions/action";
import { isErr } from "@/shared/errors/result";

const VALID_ANSWERS: readonly ContentDiagnosticAnswer[] = ["pagar-divida", "guardar", "investir"];

function isValidAnswer(raw: unknown): raw is ContentDiagnosticAnswer {
  return typeof raw === "string" && VALID_ANSWERS.includes(raw as ContentDiagnosticAnswer);
}

export const saveDiagnosticAction = action({
  schema: z.object({ answer: z.unknown() }),
  handler: async (data, { userId }) => {
    const raw = data.answer;
    if (!isValidAnswer(raw)) {
      redirect("/app/conteudo?error=invalid_answer");
    }

    const result = await saveDiagnosticAnswer(
      {
        users: repos.users,
        clock: { now: () => new Date() },
      },
      { userId, answer: raw },
    );

    if (isErr(result)) {
      if (result.error.code === "DIAGNOSTIC_FORBIDDEN_FOR_FREE") {
        redirect("/app/configuracoes/planos");
      }
      redirect("/app/conteudo?error=save_failed");
    }

    redirect("/app/conteudo/trilha");
  },
});
