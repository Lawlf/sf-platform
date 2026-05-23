"use server";

import { redirect } from "next/navigation";

import { saveDiagnosticAnswer } from "@/application/use-cases/user/save-diagnostic-answer.use-case";
import type { ContentDiagnosticAnswer } from "@/domain/entities/user.entity";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors";

const VALID_ANSWERS: readonly ContentDiagnosticAnswer[] = ["pagar-divida", "guardar", "investir"];

function isValidAnswer(raw: unknown): raw is ContentDiagnosticAnswer {
  return typeof raw === "string" && VALID_ANSWERS.includes(raw as ContentDiagnosticAnswer);
}

export async function saveDiagnosticAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const raw = formData.get("answer");
  if (!isValidAnswer(raw)) {
    redirect("/app/conteudo?error=invalid_answer");
  }

  const result = await saveDiagnosticAnswer(
    {
      users: new DrizzleUserRepository(),
      clock: { now: () => new Date() },
    },
    { userId: user.id, answer: raw },
  );

  if (isErr(result)) {
    if (result.error.code === "DIAGNOSTIC_FORBIDDEN_FOR_FREE") {
      redirect("/app/configuracoes/planos");
    }
    redirect("/app/conteudo?error=save_failed");
  }

  redirect("/app/conteudo/trilha");
}
