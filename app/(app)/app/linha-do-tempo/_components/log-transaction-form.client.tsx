"use client";

import { useQueryClient } from "@tanstack/react-query";
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

import { createTransactionAction } from "../../_actions/planning-actions";
import { MoneyInput } from "../../_components/money-input";
import { wizardInputClass } from "../../dividas/nova/_components/wizard-field";

interface FormValues {
  amountCents: bigint;
  description: string;
}

interface Props {
  defaultMonthIso?: string;
}

const NO_CATEGORY_VALUE = "__none__";

const CATEGORIES = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Saúde",
  "Lazer",
  "Educação",
  "Compras",
  "Outros",
];

function todayIso(defaultMonthIso?: string): string {
  if (defaultMonthIso) {
    const parsed = new Date(defaultMonthIso);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return new Date().toISOString().slice(0, 10);
}

export function LogTransactionForm({ defaultMonthIso }: Props) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>(NO_CATEGORY_VALUE);
  const [occurredAt, setOccurredAt] = useState<string>(() => todayIso(defaultMonthIso));
  const dateId = useId();
  const categoryId = useId();

  const form = useForm<FormValues>({
    defaultValues: { amountCents: 0n, description: "" },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    if (values.amountCents <= 0n) {
      setServerError("O valor precisa ser maior que zero.");
      return;
    }
    const description = values.description.trim();
    if (description.length === 0) {
      setServerError("Descreva o gasto.");
      return;
    }
    startTransition(async () => {
      const result = await createTransactionAction({
        amountCents: values.amountCents.toString(),
        description,
        category: category === NO_CATEGORY_VALUE ? null : category,
        occurredAtIso: occurredAt
          ? new Date(`${occurredAt}T12:00:00.000Z`).toISOString()
          : null,
      });
      if (!result.ok) {
        setServerError(result.message ?? "Não foi possível registrar o gasto.");
        return;
      }
      form.reset({ amountCents: 0n, description: "" });
      setCategory(NO_CATEGORY_VALUE);
      setOccurredAt(todayIso(defaultMonthIso));
      await queryClient.invalidateQueries({ queryKey: ["annual-report"] });
      toast.success("Gasto registrado.");
    });
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
        Registra um gasto avulso pra detalhar pra onde foi. Opcional: você também pode descrever
        pela IA, tipo &ldquo;gastei 40 no café&rdquo;.
      </p>

      <MoneyInput
        control={form.control}
        name="amountCents"
        label="Valor"
        placeholder="R$ 0,00"
        required
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${dateId}-desc`}
          className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]"
        >
          Descrição
        </label>
        <input
          id={`${dateId}-desc`}
          type="text"
          autoComplete="off"
          placeholder="Café da tarde"
          {...form.register("description")}
          className={wizardInputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span
          id={categoryId}
          className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]"
        >
          Categoria
        </span>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger aria-labelledby={categoryId} className="h-11 rounded-xl">
            <SelectValue placeholder="Sem categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CATEGORY_VALUE}>Sem categoria</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
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

      {serverError ? (
        <span role="alert" className="text-[0.8125rem] text-[color:var(--semantic-negative)]">
          {serverError}
        </span>
      ) : null}

      <Button type="submit" variant="brand" loading={pending}>
        Registrar gasto
      </Button>
    </form>
  );
}
