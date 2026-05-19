import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { signOut } from "@/application/use-cases/auth/sign-out.use-case";
import {
  SESSION_COOKIE_NAME,
  buildClearedSessionCookie,
} from "@/infrastructure/auth/session-cookie";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { loadEnv } from "@/infrastructure/config/env";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (raw) {
    await signOut(
      {
        sessions: new DrizzleSessionRepository(),
        hasher: new WebCryptoHasher(),
      },
      raw,
    );
  }

  const accept = req.headers.get("accept") ?? "";
  const wantsHtml = accept.includes("text/html");

  if (wantsHtml) {
    const env = loadEnv();
    const response = NextResponse.redirect(new URL("/entrar", env.NEXT_PUBLIC_APP_URL), {
      status: 303,
    });
    response.cookies.set(buildClearedSessionCookie());
    return response;
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set(buildClearedSessionCookie());
  return response;
}

export async function POST(req: NextRequest) {
  return handle(req);
}
