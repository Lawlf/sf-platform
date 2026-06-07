import { ChevronRight, LogOut, Trophy } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { DrizzleUserAchievementRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-achievement.repository";
import { DrizzleUserAvatarRepository } from "@/infrastructure/persistence/drizzle/repositories/drizzle-user-avatar.repository";
import { requireUser } from "@/presentation/http/middleware/cached-current-user";

import { PageShell } from "../_components/page-shell";
import { InstallSettingsButton } from "../_components/pwa/install-settings-button.client";
import { UserAvatar } from "../_components/user-avatar";

import { SettingsList } from "./_components/settings-list.client";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const user = await requireUser();
  const avatarUrl = await new DrizzleUserAvatarRepository().get(user.id);
  const achievementCount = (await new DrizzleUserAchievementRepository().listForUser(user.id))
    .length;

  const displayName = user.displayName ?? user.email.split("@")[0] ?? user.email;

  return (
    <PageShell title="Configurações" description="Ajuste a plataforma do seu jeito.">
      <Link
        href={"/app/perfil" as Route}
        className="focus-ring flex items-center gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl transition-colors hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-2)]"
      >
        <UserAvatar
          dataUrl={avatarUrl}
          displayName={displayName}
          className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-sm font-bold text-white"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[0.9375rem] font-bold text-[color:var(--text-primary)]">
            {user.displayName ?? "Sem nome"}
          </div>
          {achievementCount > 0 ? (
            <div className="mt-0.5 flex items-center gap-1.5 text-[0.75rem] font-semibold text-[color:var(--text-secondary)]">
              <Trophy size={13} strokeWidth={2.25} className="text-[#f28e25]" aria-hidden />
              {achievementCount} {achievementCount === 1 ? "conquista" : "conquistas"}
            </div>
          ) : null}
        </div>
        <ChevronRight
          size={18}
          strokeWidth={2}
          className="flex-none text-[color:var(--text-muted)]"
          aria-hidden
        />
      </Link>

      <SettingsList />

      <InstallSettingsButton />

      <form action="/api/auth/sign-out" method="post" className="mt-4">
        <button
          type="submit"
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/[0.08] px-4 py-3 text-[0.875rem] font-bold text-[color:var(--semantic-negative)] transition-colors hover:bg-[color:var(--semantic-negative)]/[0.14]"
        >
          <LogOut size={16} strokeWidth={1.75} aria-hidden />
          Sair da conta
        </button>
      </form>
    </PageShell>
  );
}
