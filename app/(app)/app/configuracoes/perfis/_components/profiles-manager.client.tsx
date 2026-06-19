"use client";

import { Pencil, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { wizardInputClass } from "../../../dividas/nova/_components/wizard-field";

import { CreateProfileSheet } from "../../../_components/create-profile-sheet.client";
import { renameProfileAction, deleteProfileAction } from "../../../_actions/profile-mgmt-actions";

interface ProfileItem {
  id: string;
  type: "PF" | "PJ_MEI";
  displayName: string | null;
  isPrimary: boolean;
  taxClassification: "mei" | "manual" | null;
}

interface Props {
  profiles: ProfileItem[];
}

function profileBadge(type: ProfileItem["type"]): string {
  return type === "PJ_MEI" ? "PJ" : "PF";
}

function profileLabel(type: ProfileItem["type"]): string {
  return type === "PJ_MEI" ? "Empresa" : "Pessoa física";
}

function profileClassification(profile: ProfileItem): string | null {
  if (profile.type === "PF") return null;
  if (profile.taxClassification === "mei") return "MEI";
  if (profile.taxClassification === "manual") return "Outro";
  return null;
}

export function ProfilesManager({ profiles }: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ProfileItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProfileItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openRename(profile: ProfileItem) {
    setRenameTarget(profile);
    setRenameValue(profile.displayName ?? "");
    setRenameError(null);
  }

  function openDelete(profile: ProfileItem) {
    setDeleteTarget(profile);
    setDeleteConfirm("");
    setDeleteError(null);
  }

  function handleRename() {
    if (!renameTarget) return;
    setRenameError(null);
    startTransition(async () => {
      const result = await renameProfileAction({
        profileId: renameTarget.id,
        displayName: renameValue.trim(),
      });
      if (!result.ok) {
        setRenameError(result.message);
        return;
      }
      setRenameTarget(null);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteProfileAction({ profileId: deleteTarget.id });
      if (!result.ok) {
        setDeleteError(result.message);
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    });
  }

  const deleteTargetName = deleteTarget?.displayName ?? (deleteTarget?.type === "PJ_MEI" ? "Empresa" : "Pessoa física");
  const deleteConfirmMatch = deleteConfirm.trim() === deleteTargetName;

  return (
    <>
      <div className="flex flex-col gap-3">
        {profiles.map((profile) => {
          const badge = profileBadge(profile.type);
          const label = profileLabel(profile.type);
          const classification = profileClassification(profile);
          const name = profile.displayName ?? label;
          return (
            <div
              key={profile.id}
              className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[0.9375rem] font-semibold text-[color:var(--text-primary)]">
                    {name}
                  </span>
                  {profile.isPrimary ? (
                    <span className="rounded bg-[color:var(--color-brand-500)]/[0.16] px-1.5 py-px text-[0.5625rem] font-bold uppercase tracking-wide text-[color:var(--color-brand-800)]">
                      Principal
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1.5 text-[0.75rem] text-[color:var(--text-secondary)]">
                  <span className="rounded bg-[color:var(--surface-2)] px-1.5 py-px text-[0.625rem] font-bold text-[color:var(--text-muted)]">
                    {badge}
                  </span>
                  <span>{label}{classification ? ` · ${classification}` : ""}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label={`Renomear ${name}`}
                  onClick={() => openRename(profile)}
                  className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-primary)]"
                >
                  <Pencil size={15} strokeWidth={1.75} aria-hidden />
                </button>
                {!profile.isPrimary ? (
                  <button
                    type="button"
                    aria-label={`Excluir ${name}`}
                    onClick={() => openDelete(profile)}
                    className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--semantic-negative)]/10 hover:text-[color:var(--semantic-negative)]"
                  >
                    <Trash2 size={15} strokeWidth={1.75} aria-hidden />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="focus-ring flex items-center gap-3 rounded-2xl border border-dashed border-[color:var(--border-soft)] bg-transparent px-4 py-3 text-[0.875rem] font-medium text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--color-brand-500)]/40 hover:bg-[color:var(--color-brand-500)]/[0.06] hover:text-[color:var(--color-brand-800)]"
        >
          <UserPlus size={16} strokeWidth={1.75} aria-hidden className="flex-none" />
          Criar perfil
        </button>
      </div>

      <CreateProfileSheet open={createOpen} onOpenChange={setCreateOpen} />

      <Sheet open={!!renameTarget} onOpenChange={(open) => { if (!open) setRenameTarget(null); }}>
        <SheetContent side="bottom" className="flex flex-col gap-5">
          <SheetHeader>
            <SheetTitle>Renomear perfil</SheetTitle>
            <SheetDescription>
              Escolha um nome que identifique esse contexto.
            </SheetDescription>
          </SheetHeader>

          <div>
            <label
              htmlFor="rename-profile-input"
              className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-primary)] opacity-80"
            >
              Nome
            </label>
            <input
              id="rename-profile-input"
              type="text"
              autoComplete="off"
              maxLength={60}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRename();
                }
              }}
              placeholder="Nome do perfil"
              className={wizardInputClass}
            />
          </div>

          {renameError ? (
            <span role="alert" className="text-[0.8125rem] text-[color:var(--semantic-negative)]">
              {renameError}
            </span>
          ) : null}

          <SheetFooter>
            <Button
              type="button"
              variant="glass"
              onClick={() => setRenameTarget(null)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="brand"
              loading={pending}
              disabled={!renameValue.trim()}
              onClick={handleRename}
            >
              Salvar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <SheetContent side="bottom" className="flex flex-col gap-5">
          <SheetHeader>
            <SheetTitle className="text-[color:var(--semantic-negative)]">Excluir perfil</SheetTitle>
            <SheetDescription>
              Isso apaga toda a renda, dívidas, patrimônio e metas desse perfil e remove ele de qualquer lar compartilhado. Não tem volta.
            </SheetDescription>
          </SheetHeader>

          <div className="rounded-xl border border-[color:var(--semantic-negative)]/25 bg-[color:var(--semantic-negative)]/[0.07] px-4 py-3 text-[0.8125rem] leading-relaxed text-[color:var(--semantic-negative)]">
            Você está prestes a excluir <strong>{deleteTargetName}</strong> e todos os dados associados.
          </div>

          <div>
            <label
              htmlFor="delete-confirm-input"
              className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-primary)] opacity-80"
            >
              Digite <span className="text-[color:var(--text-primary)] opacity-100">{deleteTargetName}</span> para confirmar
            </label>
            <input
              id="delete-confirm-input"
              type="text"
              autoComplete="off"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={deleteTargetName}
              className={wizardInputClass}
            />
          </div>

          {deleteError ? (
            <span role="alert" className="text-[0.8125rem] text-[color:var(--semantic-negative)]">
              {deleteError}
            </span>
          ) : null}

          <SheetFooter>
            <Button
              type="button"
              variant="glass"
              onClick={() => setDeleteTarget(null)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={pending}
              disabled={!deleteConfirmMatch}
              onClick={handleDelete}
            >
              Excluir perfil
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
