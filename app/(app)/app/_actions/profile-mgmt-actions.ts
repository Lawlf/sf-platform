"use server";

import { z } from "zod";

import { deleteProfile } from "@/application/use-cases/profile/delete-profile.use-case";
import { renameProfile } from "@/application/use-cases/profile/rename-profile.use-case";
import { repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

export const renameProfileAction = action({
  schema: z.object({
    profileId: z.string().min(1),
    displayName: z.string().trim().min(1).max(60),
  }),
  revalidates: ["profile", "home"],
  handler: async (data, { userId }) => {
    const result = await renameProfile(
      { profiles: repos.profiles },
      { userId, profileId: data.profileId, displayName: data.displayName },
    );
    return unwrap(result);
  },
});

export const deleteProfileAction = action({
  schema: z.object({
    profileId: z.string().min(1),
  }),
  revalidates: ["profile", "home", "debts"],
  handler: async (data, { userId }) => {
    const result = await deleteProfile(
      { profiles: repos.profiles },
      { userId, profileId: data.profileId },
    );
    return unwrap(result);
  },
});
