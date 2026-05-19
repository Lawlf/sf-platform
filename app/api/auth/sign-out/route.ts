import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { signOut } from "@/application/use-cases/auth/sign-out.use-case";
import {
  SESSION_COOKIE_NAME,
  buildClearedSessionCookie,
} from "@/infrastructure/auth/session-cookie";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
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
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set(buildClearedSessionCookie());
  return response;
}
