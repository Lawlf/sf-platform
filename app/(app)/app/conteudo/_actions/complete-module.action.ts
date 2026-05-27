"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { completeModule } from "@/application/use-cases/content/complete-module.use-case";
import { DrizzleModuleProgressRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-module-progress.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

import { DIAGNOSTIC_TO_TRILHA } from "../_lib/diagnostic-mapping";
import { loadModuleDoc } from "../_lib/module-doc";
import { findTrilha } from "../_lib/trilhas";

export async function completeModuleAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const num = Number(formData.get("moduleNum"));

  // Não confiar no slug do cliente: a trilha vem do diagnóstico do próprio usuário.
  if (!user.contentDiagnosticAnswer) {
    redirect("/app/conteudo");
  }
  const trilha = findTrilha(DIAGNOSTIC_TO_TRILHA[user.contentDiagnosticAnswer]);

  // moduleNum precisa ser um módulo pronto e com conteúdo desta trilha.
  const moduleSpec = trilha.modules.find((m) => m.num === num);
  if (!Number.isInteger(num) || !moduleSpec || moduleSpec.status !== "ready") {
    redirect("/app/conteudo/trilha?error=invalid_module");
  }
  const doc = await loadModuleDoc(trilha.slug, num);
  if (!doc) {
    redirect("/app/conteudo/trilha?error=invalid_module");
  }

  const result = await completeModule(
    {
      users: new DrizzleUserRepository(),
      progress: new DrizzleModuleProgressRepository(),
      clock: { now: () => new Date() },
    },
    { userId: user.id, trilhaSlug: trilha.slug, moduleNum: num },
  );

  if (isErr(result)) {
    if (result.error.code === "MODULE_COMPLETION_FORBIDDEN_FOR_FREE") {
      redirect("/app/configuracoes/planos");
    }
    redirect("/app/conteudo/trilha?error=complete_failed");
  }

  revalidatePath("/app/conteudo/trilha");
  redirect(("/app/conteudo/trilha?done=" + String(num)) as Route);
}

/**
 * Registra a conclusão sem redirecionar. Usado pelo player de áudio quando a
 * narração termina (o player navega sozinho pro próximo módulo). Falhas são
 * silenciosas: registrar progresso não pode travar a reprodução.
 */
export async function recordModuleDoneAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const num = Number(formData.get("moduleNum"));
  if (!user.contentDiagnosticAnswer || !Number.isInteger(num)) return;

  const trilha = findTrilha(DIAGNOSTIC_TO_TRILHA[user.contentDiagnosticAnswer]);
  const moduleSpec = trilha.modules.find((m) => m.num === num);
  if (!moduleSpec || moduleSpec.status !== "ready") return;

  await completeModule(
    {
      users: new DrizzleUserRepository(),
      progress: new DrizzleModuleProgressRepository(),
      clock: { now: () => new Date() },
    },
    { userId: user.id, trilhaSlug: trilha.slug, moduleNum: num },
  );
  revalidatePath("/app/conteudo/trilha");
}
