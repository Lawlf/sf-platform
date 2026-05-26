import { fmtDate, fmtDuration } from "../_lib/format";

import { searchUsers } from "./_actions/user-queries";
import { GrantProDialog } from "./_components/grant-pro-dialog.client";
import { RevokeProButton } from "./_components/revoke-pro-button.client";
import { UserSearch } from "./_components/user-search.client";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

const LIFETIME_YEAR = 2099;

export default async function UsuariosPage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams;
  const rows = await searchUsers(q);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Usuários</h1>
      <UserSearch />

      <section className="glass-light overflow-x-auto rounded-2xl p-4">
        <table className="w-full border-collapse text-[0.8125rem]">
          <thead>
            <tr className="text-left text-[color:var(--text-muted)]">
              <th scope="col" className="pb-2">Email</th>
              <th scope="col" className="pb-2">Plano</th>
              <th scope="col" className="pb-2">Acesso até</th>
              <th scope="col" className="pb-2">Cadastro</th>
              <th scope="col" className="pb-2">Tempo 30d</th>
              <th scope="col" className="pb-2">Última visita</th>
              <th scope="col" className="pb-2">Ação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const lifetime = u.currentPeriodEnd != null && u.currentPeriodEnd.getUTCFullYear() >= LIFETIME_YEAR;
              const planLabel = u.isPro
                ? `Pro${u.subProvider ? ` (${u.subProvider})` : ""}`
                : "Free";
              return (
                <tr key={u.id} className="border-t border-[color:var(--border-soft)] align-middle">
                  <td className="py-2 font-medium text-[color:var(--text-primary)]">{u.email}</td>
                  <td className="py-2 text-[color:var(--text-secondary)]">{planLabel}</td>
                  <td className="py-2 text-[color:var(--text-secondary)]">
                    {u.isPro ? (lifetime ? "Vitalício" : fmtDate(u.currentPeriodEnd)) : "—"}
                  </td>
                  <td className="py-2 text-[color:var(--text-secondary)]">{fmtDate(u.createdAt)}</td>
                  <td className="py-2 text-[color:var(--text-secondary)]">
                    {fmtDuration(u.activeSeconds30d)}
                  </td>
                  <td className="py-2 text-[color:var(--text-secondary)]">{fmtDate(u.lastSeenAt)}</td>
                  <td className="py-2">
                    {u.isPro && u.subProvider === "manual" ? (
                      <RevokeProButton userId={u.id} email={u.email} />
                    ) : u.isPro ? (
                      <span className="text-[0.75rem] text-[color:var(--text-muted)]">—</span>
                    ) : (
                      <GrantProDialog userId={u.id} email={u.email} />
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-[color:var(--text-muted)]">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
