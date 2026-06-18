"use server";

import { z } from "zod";

import { createMeiProfile } from "@/application/use-cases/profile/create-mei-profile.use-case";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

export const createMeiProfileAction = action({
  schema: z.object({}),
  revalidates: ["home", "debts", "profile"],
  handler: async (_input, { userId }) => {
    const result = await createMeiProfile(
      { profiles: repos.profiles, debts: repos.debts, clock },
      { userId },
    );
    return unwrap(result);
  },
});
