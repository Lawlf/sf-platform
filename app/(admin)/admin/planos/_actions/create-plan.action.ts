"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CURRENCIES } from "@/domain/value-objects/money.vo";
import { repos } from "@/infrastructure/container";
import { requireAdmin } from "@/presentation/http/middleware/cached-current-user";
import { isAdminElevated } from "@/presentation/http/middleware/require-elevated-admin";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

const createPlanSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(1, "Slug obrigatório.")
      .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen."),
    name: z.string().trim().min(1, "Nome obrigatório."),
    provider: z.enum(["stripe", "manual"]),
    providerProductId: z.string().trim().min(1).nullable(),
    providerPriceId: z.string().trim().min(1).nullable(),
    priceCents: z.string().regex(/^\d+$/, "Valor inválido."),
    currency: z.enum(CURRENCIES),
    billingInterval: z.enum(["month", "year", "lifetime"]),
    features: z.array(z.string()).default([]),
    sortOrder: z.number().int().default(0),
    active: z.boolean().default(true),
  })
  .transform((v) => ({ ...v, priceCents: BigInt(v.priceCents) }));

export type CreatePlanInput = z.input<typeof createPlanSchema>;

export async function createPlanAction(input: CreatePlanInput): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!(await isAdminElevated(admin.id)))
    return { ok: false, message: "Elevação necessária. Desbloqueie o painel para continuar." };

  const parsed = createPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  if (data.provider === "stripe" && !data.providerPriceId) {
    return { ok: false, message: "Plano Stripe precisa de um Price ID." };
  }

  const existing = await repos.plans.findBySlug(data.slug);
  if (existing) return { ok: false, message: `Já existe um plano com o slug "${data.slug}".` };

  let plan;
  try {
    plan = await repos.plans.create(data);
  } catch (e) {
    console.error("[admin] failed to create plan:", e);
    return { ok: false, message: "Falha ao criar plano. Slug ou Price ID podem já estar em uso." };
  }

  try {
    await repos.adminAuditLogs.record({
      actorId: admin.id,
      action: "plan.create",
      metadata: { planId: plan.id, slug: plan.slug },
    });
  } catch (e) {
    console.error("[admin] failed to record plan.create audit:", e);
  }

  revalidatePath("/admin/planos");
  return { ok: true };
}
