"use server";

import { z } from "zod";

import { updateUserDisplayName } from "@/application/use-cases/user/update-user-display-name.use-case";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

const schema = z.object({
  displayName: z
    .string({ error: "Nome inválido." })
    .min(1, "Nome inválido.")
    .max(120, "Nome inválido."),
});

export const updateDisplayNameAction = action({
  schema,
  revalidates: ["profile", "home"],
  handler: async ({ displayName }, { userId }) => {
    unwrap(
      await updateUserDisplayName({ users: repos.users, clock }, { userId, displayName }),
    );
  },
});
