import { NextResponse, type NextRequest } from "next/server";
import { Webhook, WebhookVerificationError } from "svix";

import { DrizzleEmailEventRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-email-event.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook do Resend (Standard Webhooks via Svix).
 * Configura em https://resend.com/webhooks apontando pra esta URL.
 * Eventos esperados: email.sent, email.delivered, email.delivery_delayed,
 * email.complained, email.bounced, email.opened, email.clicked,
 * email.failed.
 *
 * Variável de ambiente obrigatória: `RESEND_WEBHOOK_SECRET` (formato whsec_...)
 * fornecida pelo dashboard do Resend ao registrar o endpoint.
 */

interface ResendEventData {
  email_id?: string;
  to?: string | string[];
  created_at?: string;
  [key: string]: unknown;
}

interface ResendEvent {
  type: string;
  created_at?: string;
  data?: ResendEventData;
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET missing");
    return NextResponse.json({ ok: false, error: "Webhook secret not configured" }, { status: 500 });
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ ok: false, error: "Missing svix headers" }, { status: 400 });
  }

  const raw = await req.text();
  let event: ResendEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(raw, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendEvent;
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
    }
    console.error("[resend-webhook] verify failed", err);
    return NextResponse.json({ ok: false, error: "Verify error" }, { status: 400 });
  }

  const data = event.data ?? {};
  const emailId = typeof data.email_id === "string" ? data.email_id : null;
  const toRaw = data.to;
  const toEmail = Array.isArray(toRaw) ? (toRaw[0] ?? null) : (toRaw ?? null);
  const occurredAtRaw = event.created_at ?? data.created_at;
  const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();

  if (!emailId || !toEmail || !event.type) {
    return NextResponse.json({ ok: true, skipped: "missing required fields" });
  }

  try {
    await new DrizzleEmailEventRepository().record({
      emailId,
      toEmail,
      eventType: event.type,
      occurredAt,
      payload: event,
    });
  } catch (err) {
    console.error("[resend-webhook] persist failed", err);
    return NextResponse.json({ ok: false, error: "Persist error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
