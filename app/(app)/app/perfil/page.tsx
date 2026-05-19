import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/app/components/ui/button";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/require-user";

export default async function PerfilPage() {
  const user = await requireUser({
    sessions: new DrizzleSessionRepository(),
    users: new DrizzleUserRepository(),
    hasher: new WebCryptoHasher(),
    now: new Date(),
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-brand-800)]">
          Perfil
        </h1>
        <p className="mt-1 text-sm opacity-80">{user.email}</p>
      </header>
      <nav aria-label="Configuracoes do perfil" className="flex flex-col gap-3">
        <Button asChild variant="glass" className="justify-start">
          <Link href={"/app/perfil/seguranca" as Route}>Seguranca (sessoes ativas)</Link>
        </Button>
        <Button asChild variant="glass" className="justify-start">
          <Link href={"/app/perfil/conta" as Route}>Conta (desativar)</Link>
        </Button>
      </nav>
      <form action="/api/auth/sign-out" method="post">
        <Button type="submit" variant="ghost">
          Sair
        </Button>
      </form>
    </main>
  );
}
