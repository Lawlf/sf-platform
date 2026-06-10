"use server";

import { z } from "zod";

import { revokeSession } from "@/application/use-cases/auth/revoke-session.use-case";
import { repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

export const revokeSessionAction = action({
  schema: z.string().regex(/^[a-f0-9]{8,64}$/, "Sessão inválida."),
  handler: async (publicSessionId, { userId }) => {
    unwrap(
      await revokeSession({ sessions: repos.sessions }, { userId, publicSessionId }),
    );
  },
  revalidatePaths: () => ["/app/perfil/seguranca"],
});
