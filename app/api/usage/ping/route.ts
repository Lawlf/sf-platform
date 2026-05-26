import { DrizzleUsageRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-usage.repository";
import { getUsagePingLimiter } from "@/infrastructure/rate-limit/usage-ping-limiter";
import { getCurrentUser } from "@/presentation/http/middleware/cached-current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 204 });

  const limiter = getUsagePingLimiter();
  if (limiter) {
    const { success } = await limiter.limit(`usage-ping:${user.id}`);
    if (!success) return new Response(null, { status: 204 });
  }

  let path: string | null = null;
  try {
    const body = (await req.json()) as { path?: unknown };
    if (typeof body.path === "string") path = body.path.slice(0, 256);
  } catch {
    // ignore: path is optional
  }

  await new DrizzleUsageRepository().recordPing(user.id, path, new Date());
  return new Response(null, { status: 204 });
}
