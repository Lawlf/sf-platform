"use server";

import { z } from "zod";

import { createMeiProfile } from "@/application/use-cases/profile/create-mei-profile.use-case";
import { createProfile } from "@/application/use-cases/profile/create-profile.use-case";
import { clock, repos } from "@/infrastructure/container";
import { action, unwrap } from "@/presentation/actions/action";

export const createProfileAction = action({
  schema: z.object({
    profileType: z.enum(["PF", "Empresa"]),
    displayName: z.string().trim().min(1).max(60).nullable().optional(),
    taxClassification: z.enum(["mei", "manual"]).nullable().optional(),
  }),
  revalidates: ["profile", "home", "debts"],
  handler: async (data, { userId }) => {
    if (data.profileType === "Empresa" && data.taxClassification === "mei") {
      const result = await createMeiProfile(
        { profiles: repos.profiles, debts: repos.debts, clock },
        { userId },
      );
      return unwrap(result);
    }

    await createProfile(
      { profiles: repos.profiles, clock },
      {
        userId,
        type: data.profileType === "Empresa" ? "PJ_MEI" : "PF",
        displayName: data.displayName ?? null,
        taxClassification: data.profileType === "Empresa" ? (data.taxClassification ?? "manual") : null,
      },
    );
  },
});
