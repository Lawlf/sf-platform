"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { completeModule } from "@/application/use-cases/content/complete-module.use-case";
import { repos } from "@/infrastructure/container";
import { action } from "@/presentation/actions/action";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { isErr } from "@/shared/errors/result";

import { DIAGNOSTIC_TO_TRILHA } from "../_lib/diagnostic-mapping";
import { loadModuleDoc } from "../_lib/module-doc";
import { findTrilha } from "../_lib/trilhas";

const schema = z.object({ moduleNum: z.unknown() });

export const completeModuleAction = action({
  schema,
  handler: async (data, { userId }) => {
    const user = await requireUser();
    const num = Number(data.moduleNum);

    if (!user.contentDiagnosticAnswer) {
      redirect("/app/conteudo");
    }
    const trilha = findTrilha(DIAGNOSTIC_TO_TRILHA[user.contentDiagnosticAnswer]);

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
        users: repos.users,
        progress: repos.moduleProgress,
        clock: { now: () => new Date() },
      },
      { userId, trilhaSlug: trilha.slug, moduleNum: num },
    );

    if (isErr(result)) {
      if (result.error.code === "MODULE_COMPLETION_FORBIDDEN_FOR_FREE") {
        redirect("/app/configuracoes/planos");
      }
      redirect("/app/conteudo/trilha?error=complete_failed");
    }

    revalidatePath("/app/conteudo/trilha");
    redirect(("/app/conteudo/trilha?done=" + String(num)) as Route);
  },
});

export const recordModuleDoneAction = action({
  schema,
  revalidates: ["content"],
  handler: async (data, { userId }) => {
    const user = await requireUser();
    const num = Number(data.moduleNum);
    if (!user.contentDiagnosticAnswer || !Number.isInteger(num)) return;

    const trilha = findTrilha(DIAGNOSTIC_TO_TRILHA[user.contentDiagnosticAnswer]);
    const moduleSpec = trilha.modules.find((m) => m.num === num);
    if (!moduleSpec || moduleSpec.status !== "ready") return;

    await completeModule(
      {
        users: repos.users,
        progress: repos.moduleProgress,
        clock: { now: () => new Date() },
      },
      { userId, trilhaSlug: trilha.slug, moduleNum: num },
    );
  },
});
