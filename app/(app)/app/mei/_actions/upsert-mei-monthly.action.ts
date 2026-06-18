"use server";

import { z } from "zod";

import { clock, repos } from "@/infrastructure/container";
import { action, ActionError, unwrap } from "@/presentation/actions/action";
import { nonNegativeBigint } from "@/presentation/http/validators/shared.validators";

export const upsertMeiMonthlyAction = action({
  schema: z.object({
    competencia: z.string().regex(/^\d{4}-\d{2}-01$/, "Competência inválida."),
    proLaboreCents: nonNegativeBigint,
    gastoPessoalPjCents: nonNegativeBigint,
  }),
  revalidates: ["home", "mei"],
  handler: async (input, { userId }) => {
    const pf = await repos.profiles.ensurePfProfile(userId, clock.now());
    const allProfiles = await repos.profiles.listForUser(userId);
    const pj = pf.linkedProfileId
      ? allProfiles.find((p) => p.id === pf.linkedProfileId) ?? null
      : allProfiles.find((p) => p.type === "PJ_MEI" && p.userId === userId) ?? null;

    if (!pj) {
      throw new ActionError("Crie seu perfil MEI primeiro.");
    }

    const competencia = new Date(input.competencia);

    const existing = await repos.meiMonthly.findByProfileCompetencia(pj.id, competencia);
    const now = clock.now();

    const entity = await repos.meiMonthly.upsert({
      id: existing?.id ?? crypto.randomUUID(),
      profileId: pj.id,
      competencia,
      proLaboreCents: input.proLaboreCents,
      gastoPessoalPjCents: input.gastoPessoalPjCents,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    return entity;
  },
});
