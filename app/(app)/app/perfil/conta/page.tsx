import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/app/components/ui/button";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/require-user";

import { DeactivateForm } from "./_components/deactivate-form";

export default async function ContaPage() {
  await requireUser({
    sessions: new DrizzleSessionRepository(),
    users: new DrizzleUserRepository(),
    hasher: new WebCryptoHasher(),
    now: new Date(),
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-6 py-10">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-brand-800)]">
          Conta
        </h1>
        <Button asChild variant="ghost">
          <Link href={"/app/perfil" as Route}>Voltar</Link>
        </Button>
      </header>
      <section className="glass-light p-6">
        <h2 className="text-lg font-semibold">Desativar conta</h2>
        <p className="mt-2 text-sm opacity-80">
          Sua conta sera desativada imediatamente. Os dados ficam retidos conforme nossa politica de
          privacidade (LGPD). Voce nao podera entrar novamente; entre em contato com o suporte para
          reativar.
        </p>
        <div className="mt-4">
          <DeactivateForm />
        </div>
      </section>
    </main>
  );
}
