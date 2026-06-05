"use client";

import { PiggyBank } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";

import { MoneyInput } from "../../../_components/money-input";
import { recordContributionAction } from "../../_actions/goal-actions";

interface FormValues {
  amountCents: bigint;
}

interface ContributionSheetProps {
  goalId: string;
  variant: "reserve" | "savings";
  hasReserve?: boolean;
}

export function ContributionSheet({ goalId, variant, hasReserve }: ContributionSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({ defaultValues: { amountCents: 0n } });

  const title = variant === "reserve" ? "Guardar na reserva" : "Guardar na meta";
  const description =
    variant === "reserve"
      ? hasReserve
        ? "O valor é somado à sua reserva de emergência e a meta atualiza na hora."
        : "Vamos criar sua reserva de emergência com esse primeiro valor."
      : "O valor é somado ao que você já juntou e a meta atualiza na hora.";
  const successMessage = variant === "reserve" ? "Guardado na reserva." : "Guardado na meta.";

  async function onSubmit(values: FormValues) {
    if (values.amountCents <= 0n) {
      setError("Informe um valor maior que zero.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await recordContributionAction(goalId, values.amountCents.toString());
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message ?? "Não foi possível guardar agora.");
      return;
    }
    toast.success(successMessage);
    form.reset({ amountCents: 0n });
    setOpen(false);
    router.refresh();
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setError(null);
      form.reset({ amountCents: 0n });
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button type="button" variant="brand" size="sm" className="w-full justify-center gap-1.5">
          <PiggyBank size={14} strokeWidth={2} aria-hidden />
          Guardar dinheiro
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <form className="mt-4 flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <MoneyInput
            control={form.control}
            name="amountCents"
            label="Quanto guardar"
            placeholder="R$ 0,00"
            required
          />
          {error ? (
            <p role="alert" className="text-[0.75rem] text-[color:var(--semantic-negative)]">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="brand" size="default" loading={submitting}>
            Guardar
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
