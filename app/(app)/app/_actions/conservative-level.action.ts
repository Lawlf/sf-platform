"use server";

import { z } from "zod";

import { repos } from "@/infrastructure/container";
import { action } from "@/presentation/actions/action";

export const updateConservativeLevelAction = action({
  schema: z.object({
    level: z.enum(["cautious", "normal", "optimistic"]),
  }),
  revalidates: ["home"],
  handler: async (data, { profileId }) => {
    await repos.profiles.setConservativeLevel(profileId, data.level);
  },
});
