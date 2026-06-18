"use server";

import { z } from "zod";

import { createProfile } from "@/application/use-cases/profile/create-profile.use-case";
import { clock, repos } from "@/infrastructure/container";
import { action } from "@/presentation/actions/action";

export const createProfileAction = action({
  schema: z.object({
    type: z.enum(["PF", "PJ_MEI"]),
    displayName: z.string().trim().min(1).max(60).nullable().optional(),
  }),
  revalidates: ["profile", "home"],
  handler: async (data, { userId }) => {
    await createProfile(
      { profiles: repos.profiles, clock },
      { userId, type: data.type, displayName: data.displayName ?? null },
    );
  },
});
