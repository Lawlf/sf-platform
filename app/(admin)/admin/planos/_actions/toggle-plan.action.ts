"use server";

import { revalidatePath } from "next/cache";

import { repos } from "@/infrastructure/container";
import { requireAdmin } from "@/presentation/http/middleware/cached-current-user";
import { isAdminElevated } from "@/presentation/http/middleware/require-elevated-admin";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

const ELEVATION_REQUIRED = "Elevação necessária. Desbloqueie o painel para continuar.";

export async function togglePlanAction(planId: string, active: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!(await isAdminElevated(admin.id))) return { ok: false, message: ELEVATION_REQUIRED };

  const plan = await repos.plans.findById(planId);
  if (!plan) return { ok: false, message: "Plano não encontrado." };

  await repos.plans.setActive(planId, active);
  try {
    await repos.adminAuditLogs.record({
      actorId: admin.id,
      action: active ? "plan.activate" : "plan.deactivate",
      metadata: { planId, slug: plan.slug },
    });
  } catch (e) {
    console.error("[admin] failed to record plan toggle audit:", e);
  }
  revalidatePath("/admin/planos");
  return { ok: true };
}
