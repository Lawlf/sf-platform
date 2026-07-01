"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import type { Route } from "next";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { WizardRadioCard } from "@/ui/wizard-radio-card";

import { ActionRow } from "../../../_components/action-row";
import { updateGoalAction } from "../../_actions/goal-actions";
import { invalidateGoalCaches } from "../../_lib/invalidate";

const NONE_ID = "__none__";

interface GoalLinkOption {
  id: string;
  label: string;
}

interface GoalLinkSheetProps {
  goalId: string;
  type: "debt_payoff" | "emergency_fund";
  currentLinkedId: string | null;
  options: GoalLinkOption[];
}

export function GoalLinkSheet({ goalId, type, currentLinkedId, options }: GoalLinkSheetProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(
    currentLinkedId ?? (type === "emergency_fund" ? NONE_ID : ""),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = type === "debt_payoff" ? "Vincular dívida" : "Vincular conta";
  const description =
    type === "debt_payoff"
      ? "Escolha a dívida que essa meta acompanha. O progresso é calculado a partir dela."
      : "Escolha a conta que recebe os aportes dessa reserva, ou deixe sem vínculo pra registrar manualmente.";

  function handleOpenChange(next: boolean) {
    setOpen(next);
    setError(null);
    if (next) {
      setSelectedId(currentLinkedId ?? (type === "emergency_fund" ? NONE_ID : ""));
    }
  }

  async function onSave() {
    if (type === "debt_payoff" && !selectedId) {
      setError("Escolha uma dívida.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const patch =
      type === "debt_payoff"
        ? { linkedDebtId: selectedId }
        : { linkedAssetId: selectedId === NONE_ID ? null : selectedId };
    const result = await updateGoalAction({ goalId, patch });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    await invalidateGoalCaches(queryClient);
    router.refresh();
  }

  const showEmptyState = options.length === 0 && type === "debt_payoff";

  return (
    <>
      <ActionRow icon={Link2} title={title} tone="default" onClick={() => setOpen(true)} />
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>

          {showEmptyState ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[color:var(--border-soft)] px-4 py-8 text-center">
              <p className="text-sm text-[color:var(--text-secondary)]">
                Você ainda não tem nenhuma dívida ativa cadastrada.
              </p>
              <NextLink
                href={"/app/dividas/nova" as Route}
                className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[color:var(--color-brand-500)] px-4 py-2 text-[0.8125rem] font-bold text-white hover:bg-[color:var(--color-brand-600)]"
              >
                Criar dívida
              </NextLink>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {type === "emergency_fund" ? (
                <WizardRadioCard
                  title="Nenhum (aportes manuais)"
                  active={selectedId === NONE_ID}
                  onSelect={() => setSelectedId(NONE_ID)}
                />
              ) : null}
              {options.map((o) => (
                <WizardRadioCard
                  key={o.id}
                  title={o.label}
                  active={selectedId === o.id}
                  onSelect={() => setSelectedId(o.id)}
                />
              ))}
            </div>
          )}

          {error ? (
            <p role="alert" className="text-[0.75rem] text-[color:var(--semantic-negative)]">
              {error}
            </p>
          ) : null}

          {!showEmptyState ? (
            <Button
              type="button"
              variant="brand"
              size="default"
              loading={submitting}
              onClick={onSave}
            >
              Salvar
            </Button>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
