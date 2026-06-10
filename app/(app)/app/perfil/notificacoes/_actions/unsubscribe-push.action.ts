"use server";

import { z } from "zod";

import { Forbidden } from "@/domain/errors/auth-errors";
import { repos } from "@/infrastructure/container";
import { action } from "@/presentation/actions/action";

const schema = z.object({
  endpoint: z.string().url(),
});

export const unsubscribePushAction = action({
  schema,
  revalidates: ["notificationPrefs"],
  handler: async ({ endpoint }, { userId }) => {
    const repo = repos.pushSubscriptions;
    const existing = await repo.findByEndpoint(endpoint);
    if (existing && existing.userId !== userId) {
      throw new Forbidden("Acesso negado.");
    }
    await repo.deleteByEndpoint(endpoint);
    const deviceCount = (await repo.listForUser(userId)).length;
    return { deviceCount };
  },
});
