import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/app/components/ui/button";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/require-user";

import { BottomNav } from "./app/_components/bottom-nav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser({
    sessions: new DrizzleSessionRepository(),
    users: new DrizzleUserRepository(),
    hasher: new WebCryptoHasher(),
    now: new Date(),
  });

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-black/5 bg-[color:var(--color-off-white)]/80 px-4 py-2 backdrop-blur-md">
        <Link href="/app" className="text-sm font-semibold text-[color:var(--color-brand-800)]">
          Sabor Financeiro
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs opacity-70 sm:inline">{user.email}</span>
          <Button asChild variant="ghost" size="sm">
            <Link href="/app/perfil">Perfil</Link>
          </Button>
          <form action="/api/auth/sign-out" method="post">
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>
      {children}
      <BottomNav />
    </div>
  );
}
