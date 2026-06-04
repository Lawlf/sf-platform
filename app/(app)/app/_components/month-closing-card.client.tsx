"use client";

import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CalendarCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";

import { closeMonthAction } from "../_actions/planning-actions";
import {
  fetchMonthClosing,
  type MonthClosingPayload,
  type MonthClosingStatus,
} from "../_actions/planning-queries";

import { HideableValue } from "./money-visibility/hideable-value.client";

interface Props {
  initialData: MonthClosingPayload;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function leakToneVar(status: MonthClosingStatus): string {
  return status === "leaked" ? "var(--semantic-warning)" : "var(--semantic-positive)";
}

interface ReconciliationProps {
  status: MonthClosingStatus;
  leakAbsFormatted: string;
}

function ReconciliationLine({ status, leakAbsFormatted }: ReconciliationProps) {
  if (status === "on_track") {
    return (
      <p
        className="text-[0.9375rem] font-semibold leading-snug"
        style={{ color: "var(--semantic-positive)" }}
      >
        Tudo bateu: o saldo livre virou patrimônio.
      </p>
    );
  }

  if (status === "ahead") {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-[0.9375rem] font-semibold leading-snug text-[color:var(--text-primary)]">
          Seu patrimônio cresceu{" "}
          <span style={{ color: "var(--semantic-positive)" }}>
            <HideableValue>{leakAbsFormatted}</HideableValue>
          </span>{" "}
          além do saldo livre
        </p>
        <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
          Pode ser rendimento, valorização ou uma entrada extra.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[0.9375rem] font-semibold leading-snug text-[color:var(--text-primary)]">
        <span style={{ color: "var(--semantic-warning)" }}>
          <HideableValue>{leakAbsFormatted}</HideableValue>
        </span>{" "}
        não viraram patrimônio
      </p>
      <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
        Saldo que saiu em algo fora do que você acompanha. No ritmo atual, dá pra direcionar mais.
      </p>
    </div>
  );
}

export function MonthClosingCard({ initialData }: Props) {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery({
    queryKey: ["month-closing"],
    queryFn: fetchMonthClosing,
    initialData,
  });

  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!data.open) return null;

  const monthLabel = data.monthLabel ?? "o mês";
  const shortMonth = capitalize(monthLabel.split(" de ")[0] ?? monthLabel);

  function handleClose() {
    setError(null);
    startTransition(async () => {
      const result = await closeMonthAction();
      if (!result.ok) {
        setError(result.message ?? "Não foi possível fechar o mês.");
        return;
      }
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["month-closing"] });
      toast.success(`${shortMonth} fechado.`);
    });
  }

  return (
    <section className="rounded-2xl border border-[color:var(--color-brand-500)]/30 bg-[color:var(--color-brand-500)]/[0.08] p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--color-brand-500)]/[0.16] text-[color:var(--color-brand-800)]">
          <CalendarCheck size={22} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-[0.625rem] font-bold uppercase tracking-[0.7px] text-[color:var(--color-brand-800)]">
            Fechar o mês
          </span>
          <p className="mt-1 text-[0.9375rem] font-semibold text-[color:var(--text-primary)]">
            Como foi {monthLabel}?
          </p>
          <Button
            variant="brand"
            size="sm"
            className="mt-3"
            onClick={() => {
              setError(null);
              setOpen(true);
            }}
          >
            Fechar {shortMonth}
          </Button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle>Fechar {monthLabel}</SheetTitle>
            <SheetDescription>
              Veja como o saldo livre do mês se reflete no seu patrimônio.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[0.875rem] text-[color:var(--text-secondary)]">
                Saldo livre no mês
              </span>
              <span className="text-[0.9375rem] font-semibold text-[color:var(--text-primary)]">
                <HideableValue>{data.theoreticalFormatted}</HideableValue>
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-[0.875rem] text-[color:var(--text-secondary)]">
                Seu patrimônio variou
              </span>
              <span
                className="text-[0.9375rem] font-semibold"
                style={{
                  color:
                    data.status === "leaked"
                      ? "var(--text-primary)"
                      : "var(--color-brand-700)",
                }}
              >
                <HideableValue>{data.deltaFormatted}</HideableValue>
              </span>
            </div>

            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: `color-mix(in srgb, ${leakToneVar(data.status ?? "on_track")} 30%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${leakToneVar(data.status ?? "on_track")} 8%, transparent)`,
              }}
            >
              <ReconciliationLine
                status={data.status ?? "on_track"}
                leakAbsFormatted={data.leakAbsFormatted ?? ""}
              />
            </div>

            {error ? (
              <p
                className="text-[0.8125rem] font-medium"
                style={{ color: "var(--semantic-negative)" }}
              >
                {error}
              </p>
            ) : null}

            <Button variant="brand" size="lg" loading={pending} onClick={handleClose}>
              Fechar mês
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
