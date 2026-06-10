"use client";

import { Camera, Check, Pencil, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import type { ProfileBadge, SupporterTier } from "@/domain/services/profile-identity.service";

import { UserAvatar } from "../../_components/user-avatar";
import { removeAvatarAction } from "../_actions/remove-avatar.action";
import { updateAvatarAction } from "../_actions/update-avatar.action";
import { updateDisplayNameAction } from "../_actions/update-display-name.action";

import { AvatarEditModal } from "./avatar-edit-modal.client";
import { AvatarMenu } from "./avatar-menu.client";
import { ProfileBadges } from "./profile-badges.client";

export interface PerfilHeroProps {
  initialDisplayName: string;
  initialAvatarUrl?: string | null | undefined;
  username: string | null;
  supporterTier: SupporterTier;
  badges: ProfileBadge[];
  memberSince: number;
}

const heroToneClass: Record<SupporterTier, string> = {
  free: "bg-[color:var(--surface-1)] text-[color:var(--text-primary)]",
  pro_month: "glass-tier-1 text-white",
  pro_year: "glass-tier-1 text-white",
  founder: "glass-tier-1 text-white border border-[#d8b06a]",
};

const avatarRingClass: Record<SupporterTier, string> = {
  free: "",
  pro_month: "ring-2 ring-[color:var(--color-brand-500)]",
  pro_year: "ring-2 ring-[color:var(--color-brand-500)]",
  founder: "",
};

export function PerfilHero({
  initialDisplayName,
  initialAvatarUrl,
  username,
  supporterTier,
  badges,
  memberSince,
}: PerfilHeroProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialDisplayName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl ?? null);
  const [source, setSource] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarPending, startAvatarTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(displayName);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setDraft(displayName);
    setError(null);
    setEditing(false);
  }

  function save() {
    const trimmed = draft.trim();
    if (trimmed.length === 0 || trimmed.length > 120) {
      setError("Nome deve ter entre 1 e 120 caracteres.");
      return;
    }
    const fd = new FormData();
    fd.set("displayName", trimmed);
    startTransition(async () => {
      const result = await updateDisplayNameAction(fd);
      if (result.ok) {
        setDisplayName(trimmed);
        setEditing(false);
        setError(null);
      } else {
        setError(result.message);
      }
    });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError(null);
    const reader = new FileReader();
    reader.onload = () => setSource(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => setAvatarError("Não foi possível ler o arquivo.");
    reader.readAsDataURL(file);
  }

  function confirmAvatar(dataUrl: string) {
    startAvatarTransition(async () => {
      const result = await updateAvatarAction(dataUrl);
      if (result.ok) {
        setAvatarUrl(dataUrl);
        setSource(null);
        setAvatarError(null);
      } else {
        setAvatarError(result.message);
        setSource(null);
      }
    });
  }

  function removeAvatar() {
    startAvatarTransition(async () => {
      await removeAvatarAction(undefined);
      setAvatarUrl(null);
      setAvatarError(null);
      setMenuOpen(false);
    });
  }

  function changePhoto() {
    setMenuOpen(false);
    fileInputRef.current?.click();
  }

  return (
    <section
      className={`${heroToneClass[supporterTier]} relative overflow-hidden rounded-[var(--radius-card)] p-[22px]`}
    >
      {supporterTier !== "free" ? (
        <div
          className="absolute -bottom-12 -right-10 h-40 w-40 rounded-full bg-white/[0.12]"
          aria-hidden
        />
      ) : (
        <div
          className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/[0.07] blur-2xl"
          aria-hidden
        />
      )}
      <div className="relative flex items-center gap-4">
        <div className="relative flex-none">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            disabled={avatarPending}
            aria-label="Gerenciar foto de perfil"
            className="focus-ring block rounded-2xl disabled:opacity-60"
          >
            <span
              className={`block rounded-2xl ${avatarRingClass[supporterTier]}`}
              style={
                supporterTier === "founder"
                  ? { boxShadow: "0 0 0 2px var(--color-brand-500), 0 0 0 4px #d8b06a" }
                  : undefined
              }
            >
              <UserAvatar
                dataUrl={avatarUrl}
                displayName={displayName || "??"}
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-xl font-extrabold backdrop-blur-sm"
              />
            </span>
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[color:var(--color-brand-600)] shadow-[0_2px_6px_rgba(0,0,0,0.25)]">
              <Camera size={12} strokeWidth={2.25} aria-hidden />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={120}
                placeholder="Seu nome"
                aria-label="Nome do perfil"
                autoFocus
                className="w-full rounded-xl border border-white/40 bg-white/20 px-3 py-2 text-[1.25rem] font-extrabold tracking-tight text-white outline-none placeholder:text-white/60 focus:border-white"
              />
              {error ? <span className="text-[0.6875rem] text-white/95">{error}</span> : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={pending}
                  className="focus-ring inline-flex items-center gap-1 rounded-lg bg-white/30 px-3 py-1.5 text-[0.75rem] font-bold backdrop-blur-sm transition-colors hover:bg-white/45 disabled:opacity-50"
                >
                  <Check size={12} strokeWidth={2.5} aria-hidden />
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  disabled={pending}
                  className="focus-ring inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-[0.75rem] font-bold backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-50"
                >
                  <X size={12} strokeWidth={2.5} aria-hidden />
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[1.5rem] font-extrabold leading-tight tracking-tight">
                  {displayName || "Sem nome"}
                </h2>
                <button
                  type="button"
                  onClick={startEdit}
                  aria-label="Editar nome"
                  className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm transition-colors hover:bg-white/30"
                >
                  <Pencil size={12} strokeWidth={2} aria-hidden />
                </button>
              </div>
              {username ? (
                <div className="mt-1 truncate text-[0.75rem] opacity-90">@{username}</div>
              ) : null}
              <ProfileBadges
                badges={badges}
                tone={supporterTier === "free" ? "light" : "onGradient"}
              />
              {avatarError ? (
                <span className="mt-2 block text-[0.6875rem] text-white/95">{avatarError}</span>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="relative mt-3 text-[0.6875rem] text-current opacity-70">
        Membro desde {memberSince}
      </div>

      <AvatarMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        avatarUrl={avatarUrl}
        displayName={displayName}
        pending={avatarPending}
        error={avatarError}
        onChangePhoto={changePhoto}
        onRemovePhoto={removeAvatar}
      />

      {source ? (
        <AvatarEditModal
          source={source}
          pending={avatarPending}
          onCancel={() => setSource(null)}
          onConfirm={confirmAvatar}
        />
      ) : null}
    </section>
  );
}
