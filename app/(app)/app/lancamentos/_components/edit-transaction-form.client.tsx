"use client";

import { CircleDashed } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { activeCategories } from "@/domain/categories/resolve-categories";
import type { Currency } from "@/domain/value-objects/money.vo";
import { wizardInputClass } from "@/ui/wizard-field";

import type { CategoryCatalog } from "../../_actions/category-queries";
import { categoryIcon } from "../../_components/category-icons";
import { MoneyInput } from "../../_components/money-input";
import { updateTransactionAction } from "../_actions/update-transaction.action";

const NO_CATEGORY_VALUE = "__none__";

interface EditableTransaction {
  id: string;
  direction: "in" | "out";
  description: string;
  categoryKey: string | null;
  occurredAtIso: string;
  amountCents: string;
  currency: string;
}

interface Props {
  transaction: EditableTransaction;
  catalog: CategoryCatalog | null;
}

export function EditTransactionForm({ transaction, catalog }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState(transaction.categoryKey ?? NO_CATEGORY_VALUE);
  const [description, setDescription] = useState(transaction.description);
  const [occurredAt, setOccurredAt] = useState(transaction.occurredAtIso.slice(0, 10));
  const dateId = useId();
  const descId = useId();

  const form = useForm<{ amountCents: bigint }>({
    defaultValues: { amountCents: BigInt(transaction.amountCents) },
  });

  const categories = activeCategories(
    (transaction.direction === "in" ? catalog?.inflow : catalog?.expense) ?? [],
  );

  function save() {
    const nextKey = category === NO_CATEGORY_VALUE ? null : category;
    const amountCents = form.getValues("amountCents");
    if (amountCents <= 0n) {
      toast.error("O valor precisa ser maior que zero.");
      return;
    }
    const trimmedDesc = description.trim();
    startTransition(async () => {
      const r = await updateTransactionAction({
        transactionId: transaction.id,
        category: nextKey,
        description: trimmedDesc.length > 0 ? trimmedDesc : transaction.description,
        amountCents,
        occurredAtIso: new Date(`${occurredAt}T12:00:00.000Z`).toISOString(),
      });
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      toast.success("Lançamento atualizado.");
      router.push(`/app/lancamentos/${transaction.id}` as Route);
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-[22px] backdrop-blur-xl">
      <MoneyInput
        control={form.control}
        name="amountCents"
        label="Valor"
        required
        currency={transaction.currency as Currency}
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={descId}
          className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]"
        >
          Descrição
        </label>
        <input
          id={descId}
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={wizardInputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]">
          Categoria
        </span>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-11 rounded-xl border-[1.5px]">
            <SelectValue placeholder="Sem categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CATEGORY_VALUE}>
              <span className="flex items-center gap-2">
                <CircleDashed
                  size={15}
                  strokeWidth={2}
                  className="text-[color:var(--text-muted)]"
                  aria-hidden
                />
                Sem categoria
              </span>
            </SelectItem>
            {categories.map((c) => {
              const Icon = categoryIcon(c.icon);
              return (
                <SelectItem key={c.key} value={c.key}>
                  <span className="flex items-center gap-2">
                    <Icon
                      size={15}
                      strokeWidth={2}
                      className="text-[color:var(--text-secondary)]"
                      aria-hidden
                    />
                    {c.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={dateId}
          className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]"
        >
          Data
        </label>
        <input
          id={dateId}
          type="date"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
          className={wizardInputClass}
        />
      </div>

      <Button type="button" variant="brand" loading={pending} onClick={save}>
        Salvar
      </Button>
    </div>
  );
}
