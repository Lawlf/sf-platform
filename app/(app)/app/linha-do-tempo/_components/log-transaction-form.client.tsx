"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useState, useTransition } from "react";
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
import {
  listCashAccounts,
  type CashAccountOption,
} from "../_actions/list-cash-accounts.action";

interface FormValues {
  amountCents: bigint;
  description: string;
}

interface Props {
  defaultMonthIso?: string;
}

type Direction = "out" | "in";
type Status = "paid" | "scheduled";

const NO_CATEGORY_VALUE = "__none__";
const NO_ACCOUNT_VALUE = "__none__";

const OUT_CATEGORIES = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Saúde",
  "Lazer",
  "Educação",
  "Compras",
  "Outros",
];

const IN_CATEGORIES = ["Salário", "Transferência", "Presente", "Reembolso", "Venda", "Outro"];

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
  const [direction, setDirection] = useState<Direction>("out");
  const [status, setStatus] = useState<Status>("paid");
  const [category, setCategory] = useState<string>(NO_CATEGORY_VALUE);
  const [occurredAt, setOccurredAt] = useState<string>(() => todayIso(defaultMonthIso));
  const [accounts, setAccounts] = useState<CashAccountOption[] | null>(null);
  const [accountId, setAccountId] = useState<string>(NO_ACCOUNT_VALUE);
  const dateId = useId();
  const categoryId = useId();
  const accountFieldId = useId();

  const form = useForm<FormValues>({
    defaultValues: { amountCents: 0n, description: "" },
  });

  useEffect(() => {
    let active = true;
    void listCashAccounts().then((result) => {
      if (active) setAccounts(result);
    });
    return () => {
      active = false;
    };
  }, []);

  function selectDirection(next: Direction) {
    if (next === direction) return;
    setDirection(next);
    setCategory(NO_CATEGORY_VALUE);
  }

  const categories = direction === "in" ? IN_CATEGORIES : OUT_CATEGORIES;
  const hasAccounts = accounts !== null && accounts.length > 0;

  function onSubmit(values: FormValues) {
    setServerError(null);
    if (values.amountCents <= 0n) {
      setServerError("O valor precisa ser maior que zero.");
      return;
    }
    const description = values.description.trim();
    if (description.length === 0) {
      setServerError("Descreva o lançamento.");
      return;
    }
    startTransition(async () => {
      const result = await createTransactionAction({
        amountCents: values.amountCents.toString(),
        description,
        direction,
        status,
        accountId:
          accountId === NO_ACCOUNT_VALUE || !hasAccounts ? null : accountId,
        category: category === NO_CATEGORY_VALUE ? null : category,
        occurredAtIso: occurredAt
          ? new Date(`${occurredAt}T12:00:00.000Z`).toISOString()
          : null,
      });
      if (!result.ok) {
        setServerError(result.message ?? "Não foi possível registrar o lançamento.");
        return;
      }
      form.reset({ amountCents: 0n, description: "" });
      setCategory(NO_CATEGORY_VALUE);
      setStatus("paid");
      setOccurredAt(todayIso(defaultMonthIso));
      await queryClient.invalidateQueries({ queryKey: ["annual-report"] });
      toast.success(direction === "in" ? "Entrada registrada." : "Saída registrada.");
    });
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div
        role="group"
        aria-label="Tipo de lançamento"
        className="grid grid-cols-2 gap-1 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-1"
      >
        <button
          type="button"
          aria-pressed={direction === "out"}
          onClick={() => selectDirection("out")}
          className={`focus-ring rounded-lg px-3 py-2 text-[0.8125rem] font-semibold transition-colors ${
            direction === "out"
              ? "bg-[color:var(--surface-1)] text-[color:var(--semantic-negative)] shadow-sm"
              : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
          }`}
        >
          Saiu
        </button>
        <button
          type="button"
          aria-pressed={direction === "in"}
          onClick={() => selectDirection("in")}
          className={`focus-ring rounded-lg px-3 py-2 text-[0.8125rem] font-semibold transition-colors ${
            direction === "in"
              ? "bg-[color:var(--surface-1)] text-[color:var(--semantic-positive)] shadow-sm"
              : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
          }`}
        >
          Entrou
        </button>
      </div>

      <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
        Registra um lançamento avulso pra detalhar o que entrou e o que saiu. Opcional: você também
        pode descrever pela IA, tipo &ldquo;gastei 40 no café&rdquo;.
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
          placeholder={direction === "in" ? "Salário do mês" : "Café da tarde"}
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
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span
          id={accountFieldId}
          className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]"
        >
          Conta
        </span>
        {accounts !== null && !hasAccounts ? (
          <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-muted)]">
            Vamos criar uma Carteira no primeiro lançamento.
          </p>
        ) : accounts !== null ? (
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger aria-labelledby={accountFieldId} className="h-11 rounded-xl">
              <SelectValue placeholder="Escolha a conta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ACCOUNT_VALUE}>Sem conta</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]">
          Situação
        </span>
        <div
          role="group"
          aria-label="Situação do lançamento"
          className="grid grid-cols-2 gap-1 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-1"
        >
          <button
            type="button"
            aria-pressed={status === "paid"}
            onClick={() => setStatus("paid")}
            className={`focus-ring rounded-lg px-3 py-2 text-[0.8125rem] font-semibold transition-colors ${
              status === "paid"
                ? "bg-[color:var(--surface-1)] text-[color:var(--text-primary)] shadow-sm"
                : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
            }`}
          >
            {direction === "in" ? "Já recebi" : "Já paguei"}
          </button>
          <button
            type="button"
            aria-pressed={status === "scheduled"}
            onClick={() => setStatus("scheduled")}
            className={`focus-ring rounded-lg px-3 py-2 text-[0.8125rem] font-semibold transition-colors ${
              status === "scheduled"
                ? "bg-[color:var(--surface-1)] text-[color:var(--text-primary)] shadow-sm"
                : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
            }`}
          >
            Agendado
          </button>
        </div>
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
        {direction === "in" ? "Registrar entrada" : "Registrar saída"}
      </Button>
    </form>
  );
}
