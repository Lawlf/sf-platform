import type { Metadata } from "next";
import type { Route } from "next";

import { listSessions } from "@/application/use-cases/auth/list-sessions.use-case";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";

import { RevokeSessionButton } from "./_components/revoke-session-button";

export const metadata: Metadata = { title: "Segurança" };

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
  const user = await requireUser();

  const sessions = await listSessions({ sessions: new DrizzleSessionRepository() }, user.id);

  return (
    <PageShell
      title="Segurança"
      description="Sessões ativas e dispositivos."
      backHref={"/app/configuracoes" as Route}
    >
      {sessions.length === 0 ? (
        <p className="text-sm text-[color:var(--text-secondary)]">Nenhuma sessão ativa.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex flex-col gap-2 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-[13px]">
                <p className="font-bold text-[color:var(--text-primary)]">
                  Último uso: {DATE_FMT.format(s.lastUsedAt)}
                </p>
                <p className="text-[color:var(--text-secondary)]">
                  Expira em: {DATE_FMT.format(s.expiresAt)}
                </p>
                <p className="text-[color:var(--text-secondary)]">IP: {maskIp(s.ip)}</p>
                <p className="text-[color:var(--text-secondary)]" title={s.userAgent ?? undefined}>
                  Dispositivo: {shortUserAgent(s.userAgent)}
                </p>
              </div>
              <RevokeSessionButton publicSessionId={s.id} />
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
