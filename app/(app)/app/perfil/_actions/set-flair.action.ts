"use server";

import { z } from "zod";

import { setProfileFlair } from "@/application/use-cases/profile/set-profile-flair.use-case";
import { repos } from "@/infrastructure/container";
import { action } from "@/presentation/actions/action";
import { DomainError } from "@/shared/errors/domain-error";

class FlairUpdateFailed extends DomainError {
  readonly code = "FLAIR_UPDATE_FAILED" as const;
}

export const setFlairAction = action({
  schema: z.string().nullable(),
  revalidates: ["profile"],
  handler: async (flairKey, { userId }) => {
    const ok = await setProfileFlair({ users: repos.users }, { userId, flairKey });
    if (!ok) throw new FlairUpdateFailed("Não foi possível atualizar o destaque.");
  },
  revalidatePaths: () => ["/app/configuracoes/estilo"],
});
