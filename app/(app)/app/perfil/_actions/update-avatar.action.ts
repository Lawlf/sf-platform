"use server";

import { z } from "zod";

import { repos } from "@/infrastructure/container";
import { action } from "@/presentation/actions/action";
import { DomainError } from "@/shared/errors/domain-error";

import { validateAvatarDataUrl } from "./avatar-validation";

class InvalidAvatar extends DomainError {
  readonly code = "INVALID_AVATAR" as const;
}

export const updateAvatarAction = action({
  schema: z.unknown(),
  revalidates: ["profile", "home"],
  handler: async (dataUrl, { userId }) => {
    const validation = validateAvatarDataUrl(dataUrl);
    if (!validation.ok) throw new InvalidAvatar(validation.message);
    await repos.userAvatars.upsert(userId, validation.dataUrl);
  },
});
