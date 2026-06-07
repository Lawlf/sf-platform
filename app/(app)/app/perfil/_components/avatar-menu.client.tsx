"use client";

import { Camera, Trash2 } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/app/components/ui/sheet";

import { UserAvatar } from "../../_components/user-avatar";

export interface AvatarMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avatarUrl: string | null;
  displayName: string;
  pending: boolean;
  error: string | null;
  onChangePhoto: () => void;
  onRemovePhoto: () => void;
}

export function AvatarMenu({
  open,
  onOpenChange,
  avatarUrl,
  displayName,
  pending,
  error,
  onChangePhoto,
  onRemovePhoto,
}: AvatarMenuProps) {
  const hasPhoto = Boolean(avatarUrl);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="px-6 pb-8 pt-3">
        <div
          className="mx-auto mb-5 h-1 w-10 rounded-full bg-[color:var(--border-strong)] md:hidden"
          aria-hidden
        />

        <SheetHeader className="items-center gap-3">
          <UserAvatar
            dataUrl={avatarUrl}
            displayName={displayName || "??"}
            className="flex h-28 w-28 items-center justify-center rounded-3xl bg-[color:var(--surface-2)] text-3xl font-extrabold text-[color:var(--text-secondary)]"
          />
          <SheetTitle>Foto de perfil</SheetTitle>
        </SheetHeader>

        {error ? (
          <p className="mt-3 text-center text-[0.75rem] text-[color:var(--semantic-negative)]">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onChangePhoto}
            disabled={pending}
            className="focus-ring flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 text-left text-[0.875rem] font-bold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--surface-2)] disabled:opacity-50"
          >
            <Camera size={18} strokeWidth={2} aria-hidden />
            {hasPhoto ? "Trocar foto" : "Adicionar foto"}
          </button>

          {hasPhoto ? (
            <button
              type="button"
              onClick={onRemovePhoto}
              disabled={pending}
              className="focus-ring flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-4 py-3 text-left text-[0.875rem] font-bold text-[color:var(--semantic-negative)] transition-colors hover:bg-[color:var(--surface-2)] disabled:opacity-50"
            >
              <Trash2 size={18} strokeWidth={2} aria-hidden />
              Remover foto
            </button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
