import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { signOut } from "@/application/use-cases/auth/sign-out.use-case";
import {
  SESSION_COOKIE_NAME,
  buildClearedSessionCookie,
} from "@/infrastructure/auth/session-cookie";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { loadEnv } from "@/infrastructure/config/env";
import { repos } from "@/infrastructure/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isOriginAllowed(req: NextRequest, appUrl: string): boolean {
  const origin = req.headers.get("origin");
  if (origin) return origin === appUrl;
  // Some browsers (older Safari) omit Origin on same-origin requests; fall back
  // to Referer with strict host match.
  const referer = req.headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}

async function handle(req: NextRequest) {
  const env = loadEnv();
  if (!isOriginAllowed(req, env.NEXT_PUBLIC_APP_URL)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (raw) {
    await signOut(
      {
        sessions: repos.sessions,
        hasher: new WebCryptoHasher(),
      },
      raw,
    );
  }

  const accept = req.headers.get("accept") ?? "";
  const wantsHtml = accept.includes("text/html");

  if (wantsHtml) {
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
