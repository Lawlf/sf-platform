"use client";

import { ArrowDownUp, CreditCard, Landmark, Target, Wallet } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";

import { addHubCopy } from "../_lib/copy/catalogs";
import { useCopy } from "../_lib/copy/use-copy";
import { useOnline } from "../_lib/offline/use-online";
import { KindCard } from "../dividas/nova/_components/kind-card";

interface IntentOption {
  id: string;
  href: Route;
  title: string;
  description?: string;
  icon: ReactNode;
}

interface AddIntentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddIntentSheet({ open, onOpenChange }: AddIntentSheetProps) {
  const router = useRouter();
  const online = useOnline();
  const t = useCopy(addHubCopy);

  // Hub de intenção: uma pergunta única em linguagem de leigo que roteia para as
  // portas que continuam existindo por baixo (dívida, renda, patrimônio, meta,
  // lançar). Não funde entidades; unifica só a entrada. "Entrou ou saiu agora"
  // (avulso, micro) fica por último de propósito.
  const intents: readonly IntentOption[] = [
    {
      id: "divida",
      href: "/app/dividas/nova" as Route,
      title: "Comprei ou tenho conta pra pagar",
      description: "Parcela, cartão, empréstimo, conta fixa.",
      icon: <CreditCard size={22} strokeWidth={2} aria-hidden />,
    },
    {
      id: "renda",
      href: "/app/renda/nova" as Route,
      title: t("income.title"),
      description: t("income.desc"),
      icon: <Wallet size={22} strokeWidth={2} aria-hidden />,
    },
    {
      id: "patrimonio",
      href: "/app/patrimonio/novo" as Route,
      title: "O que já é meu",
      description: t("patrimonio.desc"),
      icon: <Landmark size={22} strokeWidth={2} aria-hidden />,
    },
    {
      id: "meta",
      href: "/app/metas/nova" as Route,
      title: "Quero juntar pra um objetivo",
      icon: <Target size={22} strokeWidth={2} aria-hidden />,
    },
    {
      id: "lancar",
      href: "/app/lancar" as Route,
      title: "Um gasto ou recebimento do dia",
      description: t("lancar.desc"),
      icon: <ArrowDownUp size={22} strokeWidth={2} aria-hidden />,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle>O que rolou com seu dinheiro?</SheetTitle>
          <SheetDescription>Diz o que aconteceu, a gente coloca no lugar certo.</SheetDescription>
        </SheetHeader>
        <div role="list" className="flex flex-col gap-2">
          {intents.map((intent) => (
            <Fragment key={intent.id}>
              {intent.id === "lancar" ? (
                <div className="my-0.5 h-px bg-[color:var(--border-soft)]" aria-hidden />
              ) : null}
              <KindCard
                icon={intent.icon}
                title={intent.title}
                description={intent.description}
                selected={false}
                onSelect={() => {
                  onOpenChange(false);
                  if (!online) {
                    toast("Sem internet. Você registra isso quando o sinal voltar.");
                    return;
                  }
                  router.push(intent.href);
                }}
              />
            </Fragment>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
