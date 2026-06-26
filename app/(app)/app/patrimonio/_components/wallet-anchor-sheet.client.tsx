"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";

import { MoneyInput } from "../../_components/money-input";
import { setWalletAnchorAction } from "../_actions/set-wallet-anchor.action";

type AnchorMode = "capture" | "adjust";

interface FormValues {
  valueCents: bigint;
}

interface Props {
  open: boolean;
  mode: AnchorMode;
  initialCents?: bigint;
  onOpenChange: (open: boolean) => void;
}

const COPY: Record<AnchorMode, { title: string; description: string }> = {
  capture: {
    title: "Quanto você tem na conta hoje?",
    description: "É o ponto de partida do seu mês.",
  },
  adjust: {
    title: "Ajustar saldo da Carteira",
    description: "Corrige o saldo pro que você realmente tem hoje.",
  },
};

export function WalletAnchorSheet({ open, mode, initialCents, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const seedCents = initialCents == null || initialCents < 0n ? 0n : initialCents;

  const form = useForm<FormValues>({
    defaultValues: { valueCents: seedCents as unknown as bigint },
  });

  useEffect(() => {
    if (open) {
      form.reset({ valueCents: seedCents as unknown as bigint });
      setError(null);
    }
  }, [open, initialCents, form]);

  const copy = COPY[mode];

  function handleSubmit(values: FormValues) {
    setError(null);
    const cents = typeof values.valueCents === "bigint" ? values.valueCents : 0n;
    startTransition(async () => {
      const result = await setWalletAnchorAction({ valueCents: String(cents) });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["walletBalance"] }),
        queryClient.invalidateQueries({ queryKey: ["netWorth"] }),
        queryClient.invalidateQueries({ queryKey: ["assetsWithAllocations"] }),
        queryClient.invalidateQueries({ queryKey: ["timeline"] }),
        queryClient.invalidateQueries({ queryKey: ["planning", "projection"] }),
      ]);
      toast.success(mode === "capture" ? "Saldo informado." : "Saldo atualizado.");
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle>{copy.title}</SheetTitle>
          <SheetDescription>{copy.description}</SheetDescription>
        </SheetHeader>

        <form className="flex flex-col gap-5" onSubmit={form.handleSubmit(handleSubmit)}>
          <MoneyInput
            control={form.control}
            name="valueCents"
            label="Saldo atual"
            currency="BRL"
          />

          {error ? (
            <p
              role="alert"
              className="text-[0.8125rem] font-medium"
              style={{ color: "var(--semantic-negative)" }}
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <Button type="submit" variant="brand" size="lg" loading={pending}>
              Salvar
            </Button>
            {mode === "capture" ? (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                disabled={pending}
                onClick={() => onOpenChange(false)}
              >
                Pular por agora
              </Button>
            ) : null}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
