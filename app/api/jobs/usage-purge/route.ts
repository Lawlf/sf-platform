import { lt } from "drizzle-orm";

import { timingSafeStringEqual } from "@/infrastructure/auth/timing-safe-compare";
import { getDb } from "@/infrastructure/persistence/drizzle/client";
import { usageEvents } from "@/infrastructure/persistence/drizzle/schema/usage-events.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RETENTION_DAYS = 90;

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return timingSafeStringEqual(token, cronSecret);
}

export async function GET(req: Request): Promise<Response> {
  if (!isAuthorized(req)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400 * 1000);
  await getDb().delete(usageEvents).where(lt(usageEvents.occurredAt, cutoff));

  return Response.json({ ok: true, purgedBefore: cutoff.toISOString() });
}
