"use server";

import { z } from "zod";

import { updateQuickAccess } from "@/application/use-cases/quick-access/update-quick-access.use-case";
import { repos } from "@/infrastructure/container";
import { action } from "@/presentation/actions/action";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";
import { DomainError } from "@/shared/errors/domain-error";

import { CATALOG_KEYS } from "../../../_components/quick-access/catalog";

class QuickAccessForbiddenForFree extends DomainError {
  readonly code = "QUICK_ACCESS_FORBIDDEN_FOR_FREE" as const;
}

export const saveQuickAccessAction = action({
  schema: z.array(z.string()).max(50),
  revalidates: ["home"],
  handler: async (keys) => {
    const user = await requireUser();
    if (!user.isPro) {
      throw new QuickAccessForbiddenForFree("Só assinantes Pro podem editar os acessos rápidos.");
    }
    const result = await updateQuickAccess(
      { users: repos.users },
      { user, keys, allowedKeys: CATALOG_KEYS, now: new Date() },
    );
    return { keys: result };
  },
  revalidatePaths: () => ["/app/configuracoes/acessos-rapidos"],
});
