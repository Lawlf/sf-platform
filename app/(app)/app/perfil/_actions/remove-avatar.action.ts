"use server";

import { z } from "zod";

import { repos } from "@/infrastructure/container";
import { action } from "@/presentation/actions/action";

export const removeAvatarAction = action({
  schema: z.void(),
  revalidates: ["profile", "home"],
  handler: async (_input, { userId }) => {
    await repos.userAvatars.delete(userId);
  },
});
