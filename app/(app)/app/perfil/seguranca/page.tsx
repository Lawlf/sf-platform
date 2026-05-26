import type { Metadata } from "next";
import type { Route } from "next";

import { listSessions } from "@/application/use-cases/auth/list-sessions.use-case";
import { DrizzleSessionRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-session.repository";
import { DrizzleUserCredentialsRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-credentials.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../../_components/page-shell";
import { PrefSection } from "../acessibilidade/_components/pref-section";

import { AppLockSettings } from "./_components/app-lock-settings.client";
import { RevokeSessionButton } from "./_components/revoke-session-button";
import { SecurityFactors } from "./_components/security-factors.client";

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

  const credsRepo = new DrizzleUserCredentialsRepository();
  const [creds, passkeys] = await Promise.all([
    credsRepo.find(user.id),
    credsRepo.listWebauthn(user.id),
  ]);

  const sessions = await listSessions({ sessions: new DrizzleSessionRepository() }, user.id);

  return (
    <PageShell
      title="Segurança"
      description="Verificação em duas etapas, sessões ativas e dispositivos."
      backHref={"/app/configuracoes" as Route}
    >
      <div className="divide-y divide-[color:var(--border-soft)]">
        <PrefSection
          eyebrow="Proteção"
          title="Verificação em duas etapas"
          description="Camada extra além do login por email ou Google. Ao entrar, você confirma sua identidade com um app autenticador (TOTP) ou uma passkey (Face ID, Touch ID ou chave de segurança). Opcional, deixa sua conta bem mais difícil de invadir."
        >
          <SecurityFactors hasTotp={Boolean(creds?.totpSecret)} passkeyCount={passkeys.length} />
        </PrefSection>

        <PrefSection
          eyebrow="Privacidade"
          title="Bloqueio do app"
          description="Exija biometria ou PIN ao reabrir o app, protegendo seus dados de olhares curiosos."
        >
          <AppLockSettings
            enabled={Boolean(creds?.appLockEnabled)}
            timeout={creds?.appLockTimeout ?? 60}
          />
        </PrefSection>

        <PrefSection
          eyebrow="Dispositivos"
          title="Sessões ativas"
          description="Os aparelhos e navegadores onde sua conta está conectada agora. Não reconhece algum? Encerre a sessão para desconectá-lo na hora."
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
                  <div className="text-[0.8125rem]">
                    <p className="font-bold text-[color:var(--text-primary)]">
                      Último uso: {DATE_FMT.format(s.lastUsedAt)}
                    </p>
                    <p className="text-[color:var(--text-secondary)]">
                      Expira em: {DATE_FMT.format(s.expiresAt)}
                    </p>
                    <p className="text-[color:var(--text-secondary)]">IP: {maskIp(s.ip)}</p>
                    <p
                      className="text-[color:var(--text-secondary)]"
                      title={s.userAgent ?? undefined}
                    >
                      Dispositivo: {shortUserAgent(s.userAgent)}
                    </p>
                  </div>
                  <RevokeSessionButton publicSessionId={s.id} />
                </li>
              ))}
            </ul>
          )}
        </PrefSection>
      </div>
    </PageShell>
  );
}
