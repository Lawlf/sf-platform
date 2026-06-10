import { timingSafeStringEqual } from "@/infrastructure/auth/timing-safe-compare";
import { repos } from "@/infrastructure/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return timingSafeStringEqual(token, cronSecret);
}

/**
 * Purges expired sessions and expired (legacy Postgres) magic-link tokens.
 * Data-minimisation hygiene (LGPD): expired auth artifacts carry PII (IP,
 * user-agent, e-mail/code) and must not be retained past their usefulness.
 */
export async function GET(req: Request): Promise<Response> {
  if (!isAuthorized(req)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const now = new Date();
  const sessions = await repos.sessions.deleteExpired(now);
  const magicLinkTokens = await repos.magicLinkTokens.deleteExpired(now);

  return Response.json({ ok: true, sessions, magicLinkTokens, purgedBefore: now.toISOString() });
}
