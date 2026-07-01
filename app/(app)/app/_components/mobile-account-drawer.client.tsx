"use client";

import { Lock, Plus, SlidersHorizontal } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/app/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/app/components/ui/sheet";

import type { SerializedProfile } from "../_actions/profile-queries";
import { switchProfileAction } from "../_actions/switch-profile.action";

import { CreateProfileSheet } from "./create-profile-sheet.client";
import { UserAvatar } from "./user-avatar";

function profileTypeLabel(profile: SerializedProfile): string {
  if (profile.type === "PF") return "Pessoal";
  if (profile.taxClassification === "mei") return "Negócio · MEI";
  return "Negócio";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  avatarUrl?: string | null | undefined;
  profiles: SerializedProfile[];
  activeProfileId?: string | undefined;
  canCreate?: boolean;
}

export function MobileAccountDrawer({ open, onOpenChange, displayName, avatarUrl, profiles, activeProfileId, canCreate = true }: Props) {
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
              const locked = profile.locked;
              const typeLabel = profileTypeLabel(profile);
              const name = profile.displayName ?? typeLabel;
              const subtitle = active
                ? "Em uso agora"
                : profile.displayName != null
                  ? typeLabel
                  : null;
              const avatarNode = (
                <UserAvatar
                  dataUrl={profile.isPrimary ? avatarUrl : undefined}
                  displayName={profile.displayName ?? displayName}
                  className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-[0.75rem] font-bold text-white ${active ? "ring-2 ring-[color:var(--color-brand-500)] ring-offset-2 ring-offset-[var(--surface-solid)]" : ""}`}
                />
              );
              if (locked) {
                return (
                  <Link
                    key={profile.id}
                    href={"/app/configuracoes/planos" as Route}
                    role="menuitem"
                    onClick={() => onOpenChange(false)}
                    className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left opacity-60 transition-opacity hover:opacity-100"
                  >
                    {avatarNode}
                    <span className="flex min-w-0 flex-1 flex-col items-start">
                      <span className="truncate text-[0.9375rem] font-semibold text-[color:var(--text-primary)]">
                        {name}
                      </span>
                      {subtitle ? (
                        <span className="text-[0.75rem] text-[color:var(--text-muted)]">{subtitle}</span>
                      ) : null}
                    </span>
                    <Lock size={15} strokeWidth={2} aria-hidden className="flex-none text-[color:var(--text-muted)]" />
                  </Link>
                );
              }
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
                  {avatarNode}
                  <span className="flex min-w-0 flex-1 flex-col items-start">
                    <span className="truncate text-[0.9375rem] font-semibold text-[color:var(--text-primary)]">
                      {name}
                    </span>
                    {subtitle ? (
                      <span className="text-[0.75rem] text-[color:var(--text-muted)]">{subtitle}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                setCreateOpen(true);
              }}
              className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[color:var(--surface-2)]"
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-dashed border-[color:var(--border-strong)] text-[color:var(--text-muted)]">
                <Plus size={18} strokeWidth={2} aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col items-start">
                <span className="truncate text-[0.9375rem] font-semibold text-[color:var(--text-primary)]">Criar perfil</span>
                <span className="text-[0.75rem] text-[color:var(--text-muted)]">Pessoal ou empresa</span>
              </span>
            </button>
          </div>

          <div className="h-px bg-[color:var(--border-soft)]" />

          <Button asChild variant="glass" size="lg" className="w-full gap-2">
            <Link href={"/app/configuracoes/perfis" as Route} onClick={() => onOpenChange(false)}>
              <SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden />
              Gerenciar perfis
            </Link>
          </Button>
        </SheetContent>
      </Sheet>

      <CreateProfileSheet open={createOpen} onOpenChange={setCreateOpen} canCreate={canCreate} />
    </>
  );
}
