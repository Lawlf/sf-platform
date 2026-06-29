"use client";

import { ArrowRight, Building2, Lock, UserRound } from "lucide-react";
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

import { createProfileAction } from "../_actions/create-profile.action";
import { wizardInputClass } from "../dividas/nova/_components/wizard-field";


type ProfileType = "PF" | "Empresa";
type TaxClassification = "mei" | "manual";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Free que já tem 1 perfil não cria mais: o sheet vira convite pro Pro.
  canCreate?: boolean;
}

function CreateProfilePaywall({ onClose }: { onClose: () => void }) {
  return (
    <SheetContent side="bottom" className="flex flex-col gap-5">
      <SheetHeader>
        <span
          className="grid h-10 w-10 place-items-center rounded-xl text-white"
          style={{ background: "linear-gradient(135deg,#f28e25,#ef7a1a)" }}
        >
          <Lock size={18} strokeWidth={2.2} aria-hidden />
        </span>
        <SheetTitle>Um perfil pro seu dinheiro. Outro pro MEI.</SheetTitle>
        <SheetDescription>
          No Free você mantém 1 perfil, completo e seu pra sempre. O Pro abre um segundo perfil
          separado de ponta a ponta: renda, dívida e patrimônio próprios, sem um misturar com o outro.
        </SheetDescription>
      </SheetHeader>

      <SheetFooter>
        <Button type="button" variant="glass" onClick={onClose}>
          Agora não
        </Button>
        <Button asChild variant="brand">
          <Link href={"/app/configuracoes/planos" as Route} onClick={onClose}>
            Conhecer o Pro
            <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
          </Link>
        </Button>
      </SheetFooter>
    </SheetContent>
  );
}

export function CreateProfileSheet({ open, onOpenChange, canCreate = true }: Props) {
  const router = useRouter();
  const [profileType, setProfileType] = useState<ProfileType>("PF");
  const [displayName, setDisplayName] = useState("");
  const [taxClassification, setTaxClassification] = useState<TaxClassification>("mei");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setProfileType("PF");
    setDisplayName("");
    setTaxClassification("mei");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createProfileAction({
        profileType,
        displayName: displayName.trim() || null,
        taxClassification: profileType === "Empresa" ? taxClassification : null,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      handleOpenChange(false);
      router.refresh();
    });
  }

  if (!canCreate) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <CreateProfilePaywall onClose={() => onOpenChange(false)} />
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="flex flex-col gap-5">
        <SheetHeader>
          <SheetTitle>Criar perfil</SheetTitle>
          <SheetDescription>
            Separe o dinheiro do seu pessoal e o de uma empresa MEI.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-primary)] opacity-80">
              Tipo
            </p>
            <div role="group" aria-label="Tipo de perfil" className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "PF" as const, label: "Pessoal", icon: UserRound },
                  { value: "Empresa" as const, label: "Negócio / MEI", icon: Building2 },
                ] as const
              ).map(({ value, label, icon: Icon }) => {
                const active = profileType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setProfileType(value)}
                    className={`focus-ring flex items-center gap-2.5 rounded-xl border-[1.5px] px-4 py-3 text-left transition-colors ${
                      active
                        ? "border-[color:var(--color-brand-500)]/55 bg-[color:var(--color-brand-500)]/10 text-[color:var(--color-brand-800)]"
                        : "border-[color:var(--border-soft)] text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
                    }`}
                  >
                    <Icon size={16} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                    <span className="text-[0.875rem] font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {profileType === "Empresa" ? null : (
            <div>
              <label
                htmlFor="create-profile-name"
                className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-primary)] opacity-80"
              >
                Nome
              </label>
              <input
                id="create-profile-name"
                type="text"
                autoComplete="off"
                maxLength={60}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                placeholder="Ex.: Meu perfil"
                className={wizardInputClass}
              />
            </div>
          )}

          {profileType === "Empresa" ? (
            <>
              <div>
                <label
                  htmlFor="create-profile-name-empresa"
                  className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-primary)] opacity-80"
                >
                  Nome
                </label>
                <input
                  id="create-profile-name-empresa"
                  type="text"
                  autoComplete="off"
                  maxLength={60}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreate();
                    }
                  }}
                  placeholder="Ex.: Meu negócio"
                  className={wizardInputClass}
                />
              </div>

              <div>
                <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-primary)] opacity-80">
                  Classificação fiscal
                </p>
                <div role="group" aria-label="Classificação fiscal" className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: "mei" as const, label: "MEI" },
                      { value: "manual" as const, label: "Outro tipo" },
                    ] as const
                  ).map(({ value, label }) => {
                    const active = taxClassification === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setTaxClassification(value)}
                        className={`focus-ring rounded-xl border-[1.5px] px-4 py-3 text-left transition-colors ${
                          active
                            ? "border-[color:var(--color-brand-500)]/55 bg-[color:var(--color-brand-500)]/10 text-[color:var(--color-brand-800)]"
                            : "border-[color:var(--border-soft)] text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
                        }`}
                      >
                        <span className="text-[0.875rem] font-medium">{label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[0.75rem] leading-relaxed text-[color:var(--text-secondary)]">
                  {taxClassification === "mei"
                    ? "A gente já cadastra o boleto do MEI (R 76,90/mês) pra você."
                    : "Você lança os impostos como um gasto normal, quando quiser."}
                </p>
              </div>
            </>
          ) : null}
        </div>

        {error ? (
          <span role="alert" className="text-[0.8125rem] text-[color:var(--semantic-negative)]">
            {error}
          </span>
        ) : null}

        <SheetFooter>
          <Button
            type="button"
            variant="glass"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="button" variant="brand" loading={pending} onClick={handleCreate}>
            Criar perfil
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
