"use client";

import { Check, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";

import { updateAssetAction } from "../_actions/update-asset.action";

const INPUT_CLASS =
  "focus-ring h-11 w-full rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] px-3 text-[0.9375rem] text-[color:var(--text-primary)]";

function reaisToCents(raw: string): bigint | null {
  const cleaned = raw.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return BigInt(Math.round(n * 100));
}

interface Props {
  assetId: string;
  noun: string;
  estimateCents: string | null;
  estimateFormatted: string | null;
  actualThisMonthFormatted: string | null;
}

export function AssetCostEstimateEditor({
  assetId,
  noun,
  estimateCents,
  estimateFormatted,
  actualThisMonthFormatted,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(() =>
    estimateCents !== null ? (Number(estimateCents) / 100).toString().replace(".", ",") : "",
  );
  const [pending, startTransition] = useTransition();

  function save(next: bigint | null) {
    startTransition(async () => {
      const result = await updateAssetAction({
        assetId,
        monthlyCostEstimateCents: next === null ? null : next.toString(),
      });
      if (!result.ok) {
        toast.error(result.message ?? "Não foi possível salvar a estimativa.");
        return;
      }
      setEditing(false);
      toast.success(next === null ? "Estimativa removida." : "Estimativa salva.");
      router.refresh();
    });
  }

  function handleSave() {
    const cents = reaisToCents(value);
    if (cents === null) {
      toast.error("Informe um valor válido.");
      return;
    }
    save(cents);
  }

  if (editing) {
    return (
      <div className="mt-3 flex flex-col gap-2 border-t border-[color:var(--border-soft)] pt-3">
        <label className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]">
          Quanto esse {noun} custa por mês, mais ou menos?
        </label>
        <input
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ex: 900"
          className={INPUT_CLASS}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="brand" loading={pending} onClick={handleSave}>
            <Check size={15} strokeWidth={2.5} aria-hidden />
            Salvar
          </Button>
          {estimateCents !== null ? (
            <Button type="button" variant="ghost" disabled={pending} onClick={() => save(null)}>
              Remover
            </Button>
          ) : null}
          <Button type="button" variant="ghost" disabled={pending} onClick={() => setEditing(false)}>
            <X size={15} strokeWidth={2.25} aria-hidden />
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  if (estimateFormatted === null) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="focus-ring mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg border-t-0 text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
      >
        <Pencil size={14} strokeWidth={2.25} aria-hidden />
        Estimar quanto custa por mês
      </button>
    );
  }

  return (
    <div className="mt-3 border-t border-[color:var(--border-soft)] pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.8125rem] text-[color:var(--text-secondary)]">
          Você estimou{" "}
          <span className="font-bold text-[color:var(--text-primary)]">{estimateFormatted}</span> por
          mês.
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Editar estimativa"
          className="focus-ring rounded-md text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
        >
          <Pencil size={13} strokeWidth={2} aria-hidden />
        </button>
      </div>
      {actualThisMonthFormatted ? (
        <p className="mt-1 text-[0.6875rem] text-[color:var(--text-muted)]">
          Esse mês saiu {actualThisMonthFormatted} de gastos atrelados.
        </p>
      ) : null}
    </div>
  );
}
