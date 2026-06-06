"use client";

import { Share, SquarePlus } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showProPushNote: boolean;
}

const STEPS = [
  {
    icon: Share,
    text: "Toca no ícone de Compartilhar, o quadrado com a seta pra cima, na barra de baixo.",
  },
  {
    icon: SquarePlus,
    text: "Rola e escolhe Adicionar à Tela de Início.",
  },
  {
    icon: null,
    text: "Toca em Adicionar, no canto de cima.",
  },
] as const;

export function IosInstallSheet({ open, onOpenChange, showProPushNote }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Põe o Sabor na tela inicial</SheetTitle>
          <SheetDescription>
            O iPhone não instala sozinho, então a gente te mostra. Três toques:
          </SheetDescription>
        </SheetHeader>

        <ol className="mt-5 flex flex-col gap-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[color:var(--color-brand-500)]/[0.14] text-[0.8125rem] font-bold text-[color:var(--color-brand-800)]">
                  {i + 1}
                </span>
                <div className="flex flex-1 items-center gap-2 pt-1 text-[0.875rem] text-[color:var(--text-primary)]">
                  {Icon ? (
                    <Icon
                      size={16}
                      strokeWidth={2}
                      className="flex-none text-[color:var(--text-secondary)]"
                      aria-hidden
                    />
                  ) : null}
                  <span>{step.text}</span>
                </div>
              </li>
            );
          })}
        </ol>

        {showProPushNote ? (
          <p className="mt-5 rounded-xl bg-[color:var(--surface-2)] px-3 py-2.5 text-[0.75rem] leading-relaxed text-[color:var(--text-secondary)]">
            No iPhone, o lembrete mensal do Sabor só chega depois que o app está aqui na tela
            inicial.
          </p>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
