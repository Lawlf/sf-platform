"use client";

import { Check, SlidersHorizontal, UserPlus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/app/components/ui/sheet";

import type { SerializedProfile } from "../_actions/profile-queries";
import { switchProfileAction } from "../_actions/switch-profile.action";

import { CreateProfileSheet } from "./create-profile-sheet.client";
import { UserAvatar } from "./user-avatar";

function profileBadge(type: SerializedProfile["type"]): string {
  return type === "PJ_MEI" ? "PJ" : "PF";
}

function profileSubtitle(profile: SerializedProfile): string {
  if (profile.type === "PF") return "Pessoa física";
  if (profile.taxClassification === "mei") return "Empresa · MEI";
  if (profile.taxClassification === "manual") return "Empresa · Outro";
  return "Empresa";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  avatarUrl?: string | null | undefined;
  profiles: SerializedProfile[];
  activeProfileId?: string | undefined;
}

export function MobileAccountDrawer({ open, onOpenChange, displayName, avatarUrl, profiles, activeProfileId }: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const activeId = profiles.find((p) => p.id === activeProfileId)?.id ?? profiles[0]?.id;

  function handleSwitch(profileId: string) {
    startTransition(async () => {
      await switchProfileAction({ profileId });
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>Perfil ativo</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-1">
            {profiles.map((profile) => {
              const active = profile.id === activeId;
              return (
                <button
                  key={profile.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  disabled={pending || active}
                  onClick={() => handleSwitch(profile.id)}
                  className={`focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${active ? "bg-[color:var(--color-brand-500)]/[0.10] ring-1 ring-[color:var(--color-brand-500)]/30" : "hover:bg-[color:var(--surface-2)]"}`}
                >
                  <UserAvatar
                    dataUrl={active ? avatarUrl : undefined}
                    displayName={displayName}
                    className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-[0.75rem] font-bold text-white ${active ? "ring-2 ring-[color:var(--color-brand-500)] ring-offset-2 ring-offset-[var(--surface-solid)]" : ""}`}
                  />
                  <span className="flex min-w-0 flex-1 flex-col items-start">
                    <span className="truncate text-[0.9375rem] font-semibold text-[color:var(--text-primary)]">
                      {profile.displayName ?? displayName}
                    </span>
                    <span className="text-[0.75rem] text-[color:var(--text-muted)]">{profileSubtitle(profile)}</span>
                  </span>
                  <span className="flex-none rounded bg-[color:var(--surface-2)] px-1.5 py-0.5 text-[0.6875rem] font-bold text-[color:var(--text-muted)]">
                    {profileBadge(profile.type)}
                  </span>
                  {active ? (
                    <Check size={18} strokeWidth={2.25} aria-hidden className="flex-none text-[color:var(--color-brand-800)]" />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="h-px bg-[color:var(--border-soft)]" />

          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                setCreateOpen(true);
              }}
              className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[0.9375rem] font-medium text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.10]"
            >
              <UserPlus size={18} strokeWidth={1.75} aria-hidden className="flex-none text-[color:var(--text-muted)]" />
              <span className="flex-1 text-left">Criar perfil</span>
            </button>

            <Link
              href={"/app/configuracoes/perfis" as Route}
              onClick={() => onOpenChange(false)}
              className="focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-[0.9375rem] font-medium text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.10]"
            >
              <SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden className="flex-none text-[color:var(--text-muted)]" />
              <span className="flex-1 text-left">Gerenciar perfis</span>
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      <CreateProfileSheet open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
