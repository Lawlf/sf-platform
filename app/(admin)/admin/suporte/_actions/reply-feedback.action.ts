"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import type { NotificationEntity } from "@/domain/entities/notification.entity";
import { clock, repos } from "@/infrastructure/container";
import { ResendEmailService } from "@/infrastructure/email/resend-email.service";
import type { FeedbackStatus } from "@/infrastructure/persistence/drizzle/repositories/feedback-event.repository";
import { requireAdmin } from "@/presentation/http/middleware/cached-current-user";
import { isAdminElevated } from "@/presentation/http/middleware/require-elevated-admin";

import { getFeedback } from "./feedback-queries";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

const ELEVATION_REQUIRED = "Elevação necessária. Desbloqueie o painel para continuar.";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function replyFeedbackAction(input: {
  feedbackId: string;
  reply: string;
  alsoEmail: boolean;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!(await isAdminElevated(admin.id))) return { ok: false, message: ELEVATION_REQUIRED };

  const reply = input.reply.trim();
  if (reply.length === 0) return { ok: false, message: "Escreva a resposta." };
  if (reply.length > 4000) return { ok: false, message: "Resposta muito longa." };

  const detail = await getFeedback(input.feedbackId);
  if (!detail) return { ok: false, message: "Feedback não encontrado." };

  const now = clock.now();

  const notification: NotificationEntity = {
    id: randomUUID(),
    userId: detail.userId,
    kind: "support_reply",
    monthIso: null,
    triggeredAt: now,
    payload: {
      eyebrow: "Resposta do suporte",
      line: reply,
      iconName: "MessageCircle",
      url: `/app/falar-com-a-gente/mensagens/${input.feedbackId}`,
      cta: "Ver mensagem",
    },
    dismissedAt: null,
    readAt: null,
    createdAt: now,
  };
  await repos.notifications.create(notification);

  if (input.alsoEmail && detail.userEmail) {
    try {
      await new ResendEmailService().send({
        to: detail.userEmail,
        subject: "Resposta do Sabor Financeiro",
        html: `<p>${escapeHtml(reply).replace(/\n/g, "<br>")}</p>`,
        purpose: "transactional",
      });
    } catch (e) {
      console.error("[support-reply] email failed (non-blocking):", e);
    }
  }

  await repos.feedbackEvents.recordReply(input.feedbackId, reply, now);

  revalidatePath("/admin/suporte");
  revalidatePath(`/admin/suporte/${input.feedbackId}`);
  return { ok: true };
}

export async function setFeedbackStatusAction(
  feedbackId: string,
  status: FeedbackStatus,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!(await isAdminElevated(admin.id))) return { ok: false, message: ELEVATION_REQUIRED };

  await repos.feedbackEvents.setStatus(feedbackId, status);
  revalidatePath("/admin/suporte");
  revalidatePath(`/admin/suporte/${feedbackId}`);
  return { ok: true };
}
