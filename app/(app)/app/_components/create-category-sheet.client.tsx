"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import {
  CATEGORY_ICON_NAMES,
  type CategoryDomain,
} from "@/domain/categories/default-categories";

import { createCategoryAction } from "../configuracoes/categorias/_actions/category-actions";
import { wizardInputClass } from "../dividas/nova/_components/wizard-field";

import { categoryIcon } from "./category-icons";

const SOFT_CAP = 15;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: CategoryDomain;
  isPro: boolean;
  activeCount: number;
  paywallVariant?: "quente" | "fria";
  onCreated: (key: string) => void;
}

export function CreateCategorySheet({
  open,
  onOpenChange,
  domain,
  isPro,
  activeCount,
  paywallVariant = "quente",
  onCreated,
}: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Tag");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setName("");
      setIcon("Tag");
      setError(null);
    }
  }

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createCategoryAction({ domain, name, icon });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onCreated(result.data.key);
      close(false);
    });
  }

  if (!isPro) {
    return (
      <Sheet open={open} onOpenChange={close}>
        <SheetContent side="bottom" className="flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>
              {paywallVariant === "quente"
                ? "Tem gasto que não cabe em nenhuma dessas?"
                : "As categorias prontas cobrem o básico do mês."}
            </SheetTitle>
            <SheetDescription>
              {paywallVariant === "quente"
                ? "No Pro, você cria a categoria com o nome que faz sentido pra você."
                : "No Pro, você cria as suas: Pet, Filhos, Dízimo, o que o seu mês tiver."}
            </SheetDescription>
          </SheetHeader>
          <Button asChild variant="brand">
            <Link href="/app/configuracoes/planos">Conhecer o Pro</Link>
          </Button>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="bottom" className="flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle>Criar categoria</SheetTitle>
          <SheetDescription>
            Um nome curto do seu jeito: Pet, Filhos, Dízimo.
          </SheetDescription>
        </SheetHeader>

        <input
          type="text"
          autoComplete="off"
          maxLength={24}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
          }}
          placeholder="Nome da categoria"
          className={wizardInputClass}
        />

        <div role="group" aria-label="Ícone da categoria" className="grid grid-cols-6 gap-2">
          {CATEGORY_ICON_NAMES.map((iconName) => {
            const Icon = categoryIcon(iconName);
            const active = icon === iconName;
            return (
              <button
                key={iconName}
                type="button"
                aria-pressed={active}
                onClick={() => setIcon(iconName)}
                className={`focus-ring flex items-center justify-center rounded-xl border-[1.5px] p-2.5 transition-colors ${
                  active
                    ? "border-[color:var(--color-brand-500)]/55 bg-[color:var(--color-brand-500)]/16 text-[color:var(--color-brand-500)]"
                    : "border-[color:var(--border-soft)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                }`}
              >
                <Icon size={18} strokeWidth={2} aria-hidden />
              </button>
            );
          })}
        </div>

        {activeCount >= SOFT_CAP ? (
          <p className="text-[0.75rem] leading-relaxed text-[color:var(--text-secondary)]">
            Com muita categoria, o resumo do mês fica picado. Menos fatias, leitura mais fácil.
          </p>
        ) : null}

        {error ? (
          <span role="alert" className="text-[0.8125rem] text-[color:var(--semantic-negative)]">
            {error}
          </span>
        ) : null}

        <Button type="button" variant="brand" loading={pending} onClick={handleCreate}>
          Criar categoria
        </Button>
      </SheetContent>
    </Sheet>
  );
}
