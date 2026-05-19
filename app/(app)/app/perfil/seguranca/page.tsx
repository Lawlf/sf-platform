import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/app/components/ui/button";
import { listSessions } from "@/application/use-cases/auth/list-sessions.use-case";
import { WebCryptoHasher } from "@/infrastructure/auth/web-crypto-hasher";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user.repository";
import { requireUser } from "@/presentation/http/middleware/require-user";

import { RevokeSessionButton } from "./_components/revoke-session-button";

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function maskIp(ip: string | null): string {
  if (!ip) return "desconhecido";
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.x.x`;
  return ip.slice(0, 8) + "...";
}

function shortUserAgent(ua: string | null): string {
  if (!ua) return "desconhecido";
  if (ua.length <= 60) return ua;
  return ua.slice(0, 57) + "...";
}

export default async function SegurancaPage() {
  const user = await requireUser({
    sessions: new DrizzleSessionRepository(),
    users: new DrizzleUserRepository(),
    hasher: new WebCryptoHasher(),
    now: new Date(),
  });

  const sessions = await listSessions({ sessions: new DrizzleSessionRepository() }, user.id);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-10">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-brand-800)]">
          Sessoes ativas
        </h1>
        <Button asChild variant="ghost">
          <Link href={"/app/perfil" as Route}>Voltar</Link>
        </Button>
      </header>
      {sessions.length === 0 ? (
        <p className="text-sm opacity-80">Nenhuma sessao ativa.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="glass-light flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-sm">
                <p className="font-medium">Ultimo uso: {DATE_FMT.format(s.lastUsedAt)}</p>
                <p className="opacity-70">Expira em: {DATE_FMT.format(s.expiresAt)}</p>
                <p className="opacity-70">IP: {maskIp(s.ip)}</p>
                <p className="opacity-70" title={s.userAgent ?? undefined}>
                  Dispositivo: {shortUserAgent(s.userAgent)}
                </p>
              </div>
              <RevokeSessionButton publicSessionId={s.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
