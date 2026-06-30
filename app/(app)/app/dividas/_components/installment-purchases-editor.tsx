"use client";

import { Plus, Trash2 } from "lucide-react";
import type {
  ArrayPath,
  Control,
  FieldArrayWithId,
  FieldValues,
  Path,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFormRegister,
} from "react-hook-form";

import { formatCentsBRL } from "../_lib/format";
import { WizardField, wizardInputClass } from "@/ui/wizard-field";
import { WizardMoneyField } from "@/ui/wizard-money-field";


export interface InstallmentPurchaseValue {
  description: string;
  totalCents: bigint;
  installmentsTotal: number;
  installmentsRemaining: number;
}

interface PurchaseErrors {
  description?: { message?: string };
  totalCents?: { message?: string };
  installmentsTotal?: { message?: string };
  installmentsRemaining?: { message?: string };
}

// RHF emits errors as a sparse `Merge<FieldError, ...>` array. Accept any shape
// with numeric index access; we only read `.message` strings.
type PurchaseErrorsArray =
  | { readonly [idx: number]: PurchaseErrors | undefined }
  | undefined;

interface Props<TFieldValues extends FieldValues> {
  arrayName: ArrayPath<TFieldValues>;
  control: Control<TFieldValues>;
  register: UseFormRegister<TFieldValues>;
  fields: FieldArrayWithId<TFieldValues, ArrayPath<TFieldValues>, "id">[];
  append: UseFieldArrayAppend<TFieldValues, ArrayPath<TFieldValues>>;
  remove: UseFieldArrayRemove;
  // Indexed values; pass `.installmentPurchases` watch slice (or equivalent).
  values: ReadonlyArray<Partial<InstallmentPurchaseValue>> | undefined;
  errors: PurchaseErrorsArray;
  totalMonthlyCents: bigint;
  emptyMessage?: string;
}

export function InstallmentPurchasesEditor<TFieldValues extends FieldValues>({
  arrayName,
  control,
  register,
  fields,
  append,
  remove,
  values,
  errors,
  totalMonthlyCents,
  emptyMessage = "Sem compras parceladas. Pule essa etapa ou adicione.",
}: Props<TFieldValues>) {
  const namePath = (idx: number, field: keyof InstallmentPurchaseValue): Path<TFieldValues> =>
    `${arrayName}.${idx}.${field}` as Path<TFieldValues>;

  return (
    <div className="flex flex-col gap-3">
      {fields.length === 0 ? (
        <p className="text-[0.75rem] text-[color:var(--text-muted)]">{emptyMessage}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {fields.map((field, idx) => {
            const item = values?.[idx];
            const totalCents = typeof item?.totalCents === "bigint" ? item.totalCents : 0n;
            const installmentsTotal = item?.installmentsTotal ?? 0;
            const monthlyCents =
              installmentsTotal > 0 ? totalCents / BigInt(installmentsTotal) : 0n;
            const e = errors?.[idx];
            const purchaseError =
              e?.installmentsRemaining?.message ??
              e?.description?.message ??
              e?.totalCents?.message ??
              e?.installmentsTotal?.message;
            const descId = `${field.id}-description`;
            const totalCentsId = `${field.id}-totalCents`;
            const installmentsTotalId = `${field.id}-installmentsTotal`;
            const installmentsRemainingId = `${field.id}-installmentsRemaining`;
            return (
              <div
                key={field.id}
                className="flex flex-col gap-2 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
                    Compra {idx + 1}
                  </span>
                  <button
                    type="button"
                    aria-label="Remover compra"
                    onClick={() => remove(idx)}
                    className="rounded-lg p-1 text-[color:var(--text-muted)] hover:bg-[color:var(--surface-3)] hover:text-[color:var(--semantic-negative)]"
                  >
                    <Trash2 size={14} strokeWidth={2} aria-hidden />
                  </button>
                </div>
                <WizardField label="Descrição" htmlFor={descId}>
                  <input
                    id={descId}
                    {...register(namePath(idx, "description"))}
                    placeholder="Ex: TV 50' Samsung"
                    className={wizardInputClass}
                  />
                </WizardField>
                <WizardField label="Valor total da compra" htmlFor={totalCentsId}>
                  <WizardMoneyField
                    id={totalCentsId}
                    control={control}
                    name={namePath(idx, "totalCents")}
                    placeholder="R$ 0,00"
                  />
                </WizardField>
                <div className="grid grid-cols-2 gap-2">
                  <WizardField label="Parcelas totais" htmlFor={installmentsTotalId}>
                    <input
                      id={installmentsTotalId}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={120}
                      {...register(namePath(idx, "installmentsTotal"), {
                        valueAsNumber: true,
                      })}
                      className={wizardInputClass}
                    />
                  </WizardField>
                  <WizardField label="Parcelas restantes" htmlFor={installmentsRemainingId}>
                    <input
                      id={installmentsRemainingId}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={120}
                      {...register(namePath(idx, "installmentsRemaining"), {
                        valueAsNumber: true,
                      })}
                      className={wizardInputClass}
                    />
                  </WizardField>
                </div>
                <div className="flex items-center justify-between border-t border-[color:var(--border-soft)] pt-2 text-[0.75rem]">
                  <span className="text-[color:var(--text-muted)]">Parcela mensal</span>
                  <span className="font-semibold tabular-nums text-[color:var(--text-primary)]">
                    {formatCentsBRL(monthlyCents)}
                  </span>
                </div>
                {purchaseError ? (
                  <span role="alert" className="text-[0.75rem] text-[color:var(--semantic-negative)]">
                    {purchaseError}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          append({
            description: "",
            totalCents: 0n as unknown as bigint,
            installmentsTotal: 12,
            installmentsRemaining: 12,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
        }
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-[color:var(--color-brand-500)]/40 bg-[color:var(--color-brand-500)]/[0.08] px-3 py-2.5 text-[0.8125rem] font-semibold text-[color:var(--color-brand-800)] hover:bg-[color:var(--color-brand-500)]/[0.14]"
      >
        <Plus size={14} strokeWidth={2.25} aria-hidden />
        Adicionar compra
      </button>

      {fields.length > 0 ? (
        <div className="flex items-center justify-between rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-3)] px-3 py-2.5">
          <span className="text-[0.75rem] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
            Total por mês
          </span>
          <span className="text-[0.875rem] font-bold tabular-nums text-[color:var(--text-primary)]">
            {formatCentsBRL(totalMonthlyCents)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function sumMonthlyCents(
  values: ReadonlyArray<Partial<InstallmentPurchaseValue>> | undefined,
): bigint {
  return (values ?? []).reduce<bigint>((acc, p) => {
    if (typeof p.totalCents !== "bigint" || p.totalCents <= 0n) return acc;
    if (!p.installmentsTotal || p.installmentsTotal < 1) return acc;
    return acc + p.totalCents / BigInt(p.installmentsTotal);
  }, 0n);
}
