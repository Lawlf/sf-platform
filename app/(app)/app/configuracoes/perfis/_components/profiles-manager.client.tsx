"use client";

import { ArrowRight, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
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
import type { ProfilesPayload, SerializedProfile } from "../../../_actions/profile-queries";
import { setKeptProfileAction } from "../../../_actions/switch-profile.action";
import { CreateProfileSheet } from "../../../_components/create-profile-sheet.client";
import { HowItWorksSheet } from "../../../_components/how-it-works-sheet";
import { wizardInputClass } from "../../../dividas/nova/_components/wizard-field";

function profileTypeLabel(profile: SerializedProfile): string {
  if (profile.type === "PF") return "Pessoal";
  if (profile.taxClassification === "mei") return "Negócio · MEI";
  return "Negócio";
}

function isMei(profile: SerializedProfile): boolean {
  return profile.type === "PJ_MEI" && profile.taxClassification === "mei";
}

function graceDaysLeft(graceUntilIso: string | null): number {
  if (!graceUntilIso) return 0;
  return Math.max(0, Math.ceil((new Date(graceUntilIso).getTime() - Date.now()) / 86_400_000));
}

export function ProfilesManager({ payload }: { payload: ProfilesPayload }) {
  const router = useRouter();
  const { profiles, activeProfileId, isPro, inGrace, canCreate, canChooseKept, keptProfileId } =
    payload;

  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<SerializedProfile | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SerializedProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openRename(profile: SerializedProfile) {
    setRenameTarget(profile);
    setRenameValue(profile.displayName ?? "");
    setRenameError(null);
  }

  function openDelete(profile: SerializedProfile) {
    setDeleteTarget(profile);
    setDeleteConfirm("");
    setDeleteError(null);
  }

  function handleKeep(profileId: string) {
    startTransition(async () => {
      await setKeptProfileAction({ profileId });
      router.refresh();
    });
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

  const deleteTargetName =
    deleteTarget?.displayName ?? (deleteTarget?.type === "PJ_MEI" ? "Negócio" : "Pessoal");
  const deleteConfirmMatch = deleteConfirm.trim() === deleteTargetName;

  const days = graceDaysLeft(payload.graceUntilIso);

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="-mt-1">
          <HowItWorksSheet topic="perfis" variant="plain" />
        </div>

        {inGrace ? (
          <div className="rounded-2xl border border-[color:var(--color-brand-500)]/35 bg-[color:var(--surface-2)] p-4">
            <p className="text-[0.8125rem] font-semibold text-[color:var(--text-primary)]">
              Escolha qual perfil fica ativo no Free
            </p>
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
              {days > 0
                ? `Você tem ${days} ${days === 1 ? "dia" : "dias"} pra escolher. Depois, um perfil fica ativo e os outros ficam guardados, com tudo dentro. Nada é apagado, e voltam com o Pro.`
                : "Um perfil fica ativo e os outros ficam guardados, com tudo dentro. Nada é apagado, e voltam com o Pro."}
            </p>
          </div>
        ) : null}

        {profiles.map((profile) => {
          const typeLabel = profileTypeLabel(profile);
          const name = profile.displayName ?? typeLabel;
          const active = profile.id === activeProfileId;
          const locked = profile.locked;
          const isKept = !isPro && profiles.length > 1 && profile.id === keptProfileId;
          const showKeep = canChooseKept && profile.id !== keptProfileId;
          return (
            <div
              key={profile.id}
              className={`flex items-center gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-4 backdrop-blur-xl ${
                locked ? "opacity-70" : ""
              }`}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[0.9375rem] font-semibold text-[color:var(--text-primary)]">
                    {name}
                  </span>
                  {active && !locked ? (
                    <span className="flex-none rounded bg-[color:var(--color-brand-500)]/[0.16] px-1.5 py-px text-[0.5625rem] font-bold uppercase tracking-wide text-[color:var(--color-brand-800)]">
                      Em uso agora
                    </span>
                  ) : null}
                  {locked ? (
                    <span className="flex flex-none items-center gap-1 rounded bg-[color:var(--surface-3)] px-1.5 py-px text-[0.5625rem] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
                      <Lock size={9} strokeWidth={2.5} aria-hidden />
                      Guardado
                    </span>
                  ) : isKept ? (
                    <span className="flex-none rounded bg-[color:var(--color-brand-500)]/[0.16] px-1.5 py-px text-[0.5625rem] font-bold uppercase tracking-wide text-[color:var(--color-brand-800)]">
                      Fica no Free
                    </span>
                  ) : null}
                </div>
                <span className="text-[0.75rem] text-[color:var(--text-secondary)]">
                  {locked ? "Guardado · seus dados estão salvos" : typeLabel}
                </span>
                {isMei(profile) && !locked ? (
                  <span className="mt-1 text-[0.75rem] text-[color:var(--text-muted)]">
                    Boleto do MEI (R$ 76,90/mês) já entra como despesa aqui.
                  </span>
                ) : null}
                {showKeep ? (
                  <button
                    type="button"
                    onClick={() => handleKeep(profile.id)}
                    disabled={pending}
                    className="focus-ring mt-2 inline-flex w-fit items-center gap-1 rounded-lg border border-[color:var(--color-brand-500)]/40 px-2.5 py-1 text-[0.75rem] font-semibold text-[color:var(--color-brand-800)] transition-colors hover:bg-[color:var(--color-brand-500)]/[0.08]"
                  >
                    Manter este no Free
                  </button>
                ) : null}
                {locked && !showKeep ? (
                  <Link
                    href={"/app/configuracoes/planos" as Route}
                    className="focus-ring mt-2 inline-flex w-fit items-center gap-1 text-[0.75rem] font-semibold text-[color:var(--color-brand-800)] hover:underline"
                  >
                    Voltar pro Pro pra usar
                    <ArrowRight size={12} strokeWidth={2.5} aria-hidden />
                  </Link>
                ) : null}
              </div>
              {!locked ? (
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
              ) : (
                <Lock size={16} strokeWidth={2} aria-hidden className="flex-none text-[color:var(--text-muted)]" />
              )}
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
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-2">
              <span className="text-[0.875rem] font-semibold text-[color:var(--text-primary)]">Criar perfil</span>
              {!canCreate ? (
                <span className="flex-none rounded bg-[color:var(--color-brand-500)]/[0.16] px-1.5 py-px text-[0.5625rem] font-bold uppercase tracking-wide text-[color:var(--color-brand-800)]">
                  Pro
                </span>
              ) : null}
            </span>
            <span className="text-[0.75rem] text-[color:var(--text-muted)]">
              Separe o dinheiro de um negócio (MEI, por exemplo) do seu pessoal.
            </span>
          </span>
        </button>
      </div>

      <CreateProfileSheet open={createOpen} onOpenChange={setCreateOpen} canCreate={canCreate} />

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
            <Button type="button" variant="glass" onClick={() => setRenameTarget(null)} disabled={pending}>
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
            <Button type="button" variant="glass" onClick={() => setDeleteTarget(null)} disabled={pending}>
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
