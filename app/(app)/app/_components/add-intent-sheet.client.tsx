"use client";

import { ArrowLeftRight, Coins, ShoppingBag, Target, TrendingUp } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";

import { KindCard } from "../dividas/nova/_components/kind-card";

interface IntentOption {
  id: string;
  href: Route;
  title: string;
  description: string;
  icon: ReactNode;
}

// Hub de intenção: uma pergunta única em linguagem de leigo que roteia para as
// portas que continuam existindo por baixo (dívida, renda, patrimônio, meta,
// lançar). Não funde entidades; unifica só a entrada. "Entrou ou saiu agora"
// (avulso, micro) fica por último de propósito.
const INTENTS: readonly IntentOption[] = [
  {
    id: "divida",
    href: "/app/dividas/nova" as Route,
    title: "Comprei algo ou tenho conta pra pagar",
    description: "Algo que você vai pagar ao longo dos meses: compra parcelada, cartão, empréstimo, conta fixa.",
    icon: <ShoppingBag size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "renda",
    href: "/app/renda/nova" as Route,
    title: "Ganho isso todo mês",
    description: "Salário, aposentadoria, aluguel, freela fixo.",
    icon: <TrendingUp size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "patrimonio",
    href: "/app/patrimonio/novo" as Route,
    title: "Já tenho um bem ou guardado",
    description: "Carro, casa, reserva, investimento.",
    icon: <Coins size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "meta",
    href: "/app/metas/nova" as Route,
    title: "Quero juntar pra um objetivo",
    description: "Uma meta pra guardar dinheiro.",
    icon: <Target size={20} strokeWidth={1.75} aria-hidden />,
  },
  {
    id: "lancar",
    href: "/app/lancar" as Route,
    title: "Entrou ou saiu agora",
    description: "Já entrou ou saiu, e acabou ali: um PIX, uma venda, um gasto do dia.",
    icon: <ArrowLeftRight size={20} strokeWidth={1.75} aria-hidden />,
  },
] as const;

interface AddIntentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddIntentSheet({ open, onOpenChange }: AddIntentSheetProps) {
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle>O que rolou com seu dinheiro?</SheetTitle>
          <SheetDescription>Diz o que aconteceu, a gente coloca no lugar certo.</SheetDescription>
        </SheetHeader>
        <div role="list" className="flex flex-col gap-2">
          {INTENTS.map((intent) => (
            <KindCard
              key={intent.id}
              icon={intent.icon}
              title={intent.title}
              description={intent.description}
              selected={false}
              onSelect={() => {
                onOpenChange(false);
                router.push(intent.href);
              }}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
