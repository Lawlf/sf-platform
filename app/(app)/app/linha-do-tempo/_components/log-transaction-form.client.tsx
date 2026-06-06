"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  Car,
  Check,
  CircleDashed,
  GraduationCap,
  Gift,
  HeartPulse,
  House,
  Plus,
  ShoppingBag,
  Store,
  Tag,
  Ticket,
  Undo2,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";
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
import { createCashAccount } from "../_actions/create-cash-account.action";
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
const DEFAULT_ACCOUNT_VALUE = "__default__";

interface CategoryOption {
  label: string;
  icon: LucideIcon;
}

const OUT_CATEGORIES: CategoryOption[] = [
  { label: "Alimentação", icon: Utensils },
  { label: "Transporte", icon: Car },
  { label: "Moradia", icon: House },
  { label: "Saúde", icon: HeartPulse },
  { label: "Lazer", icon: Ticket },
  { label: "Educação", icon: GraduationCap },
  { label: "Compras", icon: ShoppingBag },
  { label: "Outros", icon: Tag },
];

const IN_CATEGORIES: CategoryOption[] = [
  { label: "Salário", icon: Banknote },
  { label: "Transferência", icon: ArrowLeftRight },
  { label: "Presente", icon: Gift },
  { label: "Reembolso", icon: Undo2 },
  { label: "Venda", icon: Store },
  { label: "Outro", icon: Tag },
];

const SEGMENT_TRACK =
  "grid grid-cols-2 gap-1.5 rounded-xl border-[1.5px] border-[color:var(--border-soft)] bg-[color:var(--surface-1)] p-1.5";
const SEGMENT_BASE =
  "focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-[0.8125rem] font-semibold transition-all";

const SEGMENT_ACTIVE = {
  negative:
    "border-[color:var(--semantic-negative)]/55 bg-[color:var(--semantic-negative)]/14 text-[color:var(--semantic-negative)] shadow-sm",
  positive:
    "border-[color:var(--semantic-positive)]/55 bg-[color:var(--semantic-positive)]/14 text-[color:var(--semantic-positive)] shadow-sm",
  brand:
    "border-[color:var(--color-brand-500)]/55 bg-[color:var(--color-brand-500)]/16 text-[color:var(--color-brand-500)] shadow-sm",
} as const;

function segmentClass(active: boolean, tone: keyof typeof SEGMENT_ACTIVE): string {
  if (!active) {
    return `${SEGMENT_BASE} border-transparent text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]`;
  }
  return `${SEGMENT_BASE} ${SEGMENT_ACTIVE[tone]}`;
}

const SELECT_TRIGGER_CLASS = "h-11 rounded-xl border-[1.5px]";

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
  const [accountId, setAccountId] = useState<string>(DEFAULT_ACCOUNT_VALUE);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [accountPending, startAccountTransition] = useTransition();
  const dateId = useId();
  const categoryId = useId();
  const accountFieldId = useId();

  const form = useForm<FormValues>({
    defaultValues: { amountCents: 0n, description: "" },
  });

  useEffect(() => {
    let active = true;
    void listCashAccounts().then((result) => {
      if (!active) return;
      setAccounts(result);
      const first = result[0];
      if (first) setAccountId(first.id);
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

  function handleCreateAccount() {
    const name = newAccountName.trim();
    if (name.length === 0) return;
    setServerError(null);
    startAccountTransition(async () => {
      const result = await createCashAccount(name);
      if (!result.ok) {
        setServerError(result.message);
        return;
      }
      setAccounts((prev) => [...(prev ?? []), result.account]);
      setAccountId(result.account.id);
      setNewAccountName("");
      setShowNewAccount(false);
    });
  }

  const categories = direction === "in" ? IN_CATEGORIES : OUT_CATEGORIES;

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
        accountId: accountId === DEFAULT_ACCOUNT_VALUE ? null : accountId,
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
      <div role="group" aria-label="Tipo de lançamento" className={SEGMENT_TRACK}>
        <button
          type="button"
          aria-pressed={direction === "out"}
          onClick={() => selectDirection("out")}
          className={segmentClass(direction === "out", "negative")}
        >
          <ArrowUpRight size={15} strokeWidth={2.25} aria-hidden />
          Saiu
        </button>
        <button
          type="button"
          aria-pressed={direction === "in"}
          onClick={() => selectDirection("in")}
          className={segmentClass(direction === "in", "positive")}
        >
          <ArrowDownLeft size={15} strokeWidth={2.25} aria-hidden />
          Entrou
        </button>
      </div>

      <p className="text-[0.8125rem] leading-relaxed text-[color:var(--text-secondary)]">
        Pense numa gota caindo no balde: cada lançamento muda o nível do que você tem ou deve. É
        pontual e opcional, não um diário de gastos. Use quando fizer diferença.
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
          placeholder={direction === "in" ? "Freela extra" : "Fatura do cartão"}
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
          <SelectTrigger aria-labelledby={categoryId} className={SELECT_TRIGGER_CLASS}>
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
            {categories.map(({ label, icon: Icon }) => (
              <SelectItem key={label} value={label}>
                <span className="flex items-center gap-2">
                  <Icon
                    size={15}
                    strokeWidth={2}
                    className="text-[color:var(--text-secondary)]"
                    aria-hidden
                  />
                  {label}
                </span>
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
        {accounts !== null ? (
          <>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger aria-labelledby={accountFieldId} className={SELECT_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.length === 0 ? (
                  <SelectItem value={DEFAULT_ACCOUNT_VALUE}>
                    <span className="flex items-center gap-2">
                      <Wallet
                        size={15}
                        strokeWidth={2}
                        className="text-[color:var(--text-secondary)]"
                        aria-hidden
                      />
                      Carteira
                    </span>
                  </SelectItem>
                ) : (
                  accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        <Wallet
                          size={15}
                          strokeWidth={2}
                          className="text-[color:var(--text-secondary)]"
                          aria-hidden
                        />
                        {a.label}
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {showNewAccount ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  autoComplete="off"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateAccount();
                    }
                  }}
                  placeholder="Nome da conta, ex: Nubank"
                  className={wizardInputClass}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="brand"
                    loading={accountPending}
                    onClick={handleCreateAccount}
                  >
                    Criar conta
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewAccount(false);
                      setNewAccountName("");
                    }}
                    className="focus-ring rounded-lg px-2 py-1 text-[0.8125rem] font-medium text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowNewAccount(true)}
                className="focus-ring inline-flex w-fit items-center gap-1.5 rounded-lg text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
              >
                <Plus size={14} strokeWidth={2.5} aria-hidden />
                Nova conta
              </button>
            )}
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]">
          Situação
        </span>
        <div role="group" aria-label="Situação do lançamento" className={SEGMENT_TRACK}>
          <button
            type="button"
            aria-pressed={status === "paid"}
            onClick={() => setStatus("paid")}
            className={segmentClass(status === "paid", "brand")}
          >
            <Check size={15} strokeWidth={2.5} aria-hidden />
            {direction === "in" ? "Já recebi" : "Já paguei"}
          </button>
          <button
            type="button"
            aria-pressed={status === "scheduled"}
            onClick={() => setStatus("scheduled")}
            className={segmentClass(status === "scheduled", "brand")}
          >
            <CalendarClock size={15} strokeWidth={2.25} aria-hidden />
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
