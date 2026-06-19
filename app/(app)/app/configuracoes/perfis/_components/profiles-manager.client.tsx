"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
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

import { renameProfileAction, deleteProfileAction } from "../../../_actions/profile-mgmt-actions";
import { CreateProfileSheet } from "../../../_components/create-profile-sheet.client";
import { wizardInputClass } from "../../../dividas/nova/_components/wizard-field";


interface ProfileItem {
  id: string;
  type: "PF" | "PJ_MEI";
  displayName: string | null;
  isPrimary: boolean;
  taxClassification: "mei" | "manual" | null;
}

interface Props {
  profiles: ProfileItem[];
  activeProfileId: string;
}

function profileTypeLabel(profile: ProfileItem): string {
  if (profile.type === "PF") return "Pessoal";
  if (profile.taxClassification === "mei") return "Empresa · MEI";
  return "Empresa";
}

function isMei(profile: ProfileItem): boolean {
  return profile.type === "PJ_MEI" && profile.taxClassification === "mei";
}

export function ProfilesManager({ profiles, activeProfileId }: Props) {
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

  const deleteTargetName = deleteTarget?.displayName ?? (deleteTarget?.type === "PJ_MEI" ? "Empresa" : "Pessoal");
  const deleteConfirmMatch = deleteConfirm.trim() === deleteTargetName;

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)] backdrop-blur-xl">
          Cada perfil é um conjunto separado de dinheiro: renda, dívidas e patrimônio. Você troca de perfil no topo do app, e os números mudam junto. A maioria das pessoas usa só um. Se você tem uma empresa MEI, dá pra separar o dinheiro dela aqui.
        </div>

        {profiles.map((profile) => {
          const typeLabel = profileTypeLabel(profile);
          const name = profile.displayName ?? typeLabel;
          const active = profile.id === activeProfileId;
          return (
            <div
              key={profile.id}
              className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[0.9375rem] font-semibold text-[color:var(--text-primary)]">
                    {name}
                  </span>
                  {active ? (
                    <span className="flex-none rounded bg-[color:var(--color-brand-500)]/[0.16] px-1.5 py-px text-[0.5625rem] font-bold uppercase tracking-wide text-[color:var(--color-brand-800)]">
                      Em uso agora
                    </span>
                  ) : null}
                </div>
                <span className="text-[0.75rem] text-[color:var(--text-secondary)]">{typeLabel}</span>
                {isMei(profile) ? (
                  <span className="mt-1 text-[0.75rem] text-[color:var(--text-muted)]">
                    Boleto do MEI (R$ 76,90/mês) já cadastrado aqui.
                  </span>
                ) : null}
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
          className="focus-ring flex items-center gap-3 rounded-2xl border border-dashed border-[color:var(--border-soft)] bg-transparent px-4 py-3 text-left transition-colors hover:border-[color:var(--color-brand-500)]/40 hover:bg-[color:var(--color-brand-500)]/[0.06]"
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-dashed border-[color:var(--border-strong)] text-[color:var(--text-muted)]">
            <Plus size={18} strokeWidth={2} aria-hidden />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">Criar perfil</span>
            <span className="text-[0.75rem] text-[color:var(--text-muted)]">Separe o dinheiro de uma empresa MEI do seu pessoal.</span>
          </span>
        </button>
      </div>

      <CreateProfileSheet open={createOpen} onOpenChange={setCreateOpen} />

      <Sheet open={!!renameTarget} onOpenChange={(open) => { if (!open) setRenameTarget(null); }}>
        <SheetContent side="bottom" className="flex flex-col gap-5">
          <SheetHeader>
            <SheetTitle>Renomear perfil</SheetTitle>
            <SheetDescription>
              Dá um nome que você reconheça. Ex: Pessoal, Minha empresa, Loja.
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
              Some a renda, as dívidas, o patrimônio e as metas deste perfil. Seus outros perfis e o dinheiro deles continuam intactos. Isso não tem volta.
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
