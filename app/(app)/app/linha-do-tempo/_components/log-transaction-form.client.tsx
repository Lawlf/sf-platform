"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  Check,
  CircleDashed,
  Pencil,
  Plus,
  Tag,
  Wallet,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { activeCategories } from "@/domain/categories/resolve-categories";

import type { IncomeFreeBalanceEvent } from "../../_actions/_free-balance-event";
import {
  listCategoriesQuery,
  type CategoryCatalog,
} from "../../_actions/category-queries";
import { createTransactionAction } from "../../_actions/planning-actions";
import { categoryIcon } from "../../_components/category-icons";
import { CreateCategorySheet } from "../../_components/create-category-sheet.client";
import { MoneyInput } from "../../_components/money-input";
import { lancarCopy } from "../../_lib/copy/catalogs";
import { useCopy } from "../../_lib/copy/use-copy";
import { wizardInputClass } from "../../dividas/nova/_components/wizard-field";
import { IncomeFreeBalanceResult } from "../../renda/_components/income-free-balance-result";
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

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function isFutureIso(iso: string): boolean {
  return iso > new Date().toISOString().slice(0, 10);
}

export function LogTransactionForm({ defaultMonthIso }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useCopy(lancarCopy);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [eventResult, setEventResult] = useState<IncomeFreeBalanceEvent | null>(null);
  const [direction, setDirection] = useState<Direction>("out");
  const [status, setStatus] = useState<Status>("paid");
  const [category, setCategory] = useState<string>(NO_CATEGORY_VALUE);
  const [occurredAt, setOccurredAt] = useState<string>(() => todayIso(defaultMonthIso));
  const [accounts, setAccounts] = useState<CashAccountOption[] | null>(null);
  const [accountId, setAccountId] = useState<string>(DEFAULT_ACCOUNT_VALUE);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  // Progressive disclosure: agendado e data ficam escondidos atrás de links. O
  // caminho feliz é "já paguei/recebi" + hoje, sem campos competindo.
  const [showSchedule, setShowSchedule] = useState(false);
  const [showDate, setShowDate] = useState(false);
  // Quando só existe a Carteira, o campo Conta some atrás de um link. O caminho
  // feliz não escolhe conta.
  const [showAccount, setShowAccount] = useState(false);
  // Categoria fica atrás de link: é o campo mais micro da tela, e o app é macro.
  // Esconder protege o posicionamento (não vira tracker de cafezinho) e limpa o
  // caminho feliz pra valor + descrição.
  const [showCategory, setShowCategory] = useState(false);
  const [catalog, setCatalog] = useState<CategoryCatalog | null>(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
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
    void listCategoriesQuery().then((result) => {
      if (active) setCatalog(result);
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
      const result = await createCashAccount({ label: name });
      if (!result.ok) {
        setServerError(result.message);
        return;
      }
      setAccounts((prev) => [...(prev ?? []), result.data.account]);
      setAccountId(result.data.account.id);
      setNewAccountName("");
      setShowNewAccount(false);
    });
  }

  // "Salário" continua fora das entradas de propósito: renda recorrente tem
  // porta própria (/app/renda/nova). Deixar salário como avulso era o overlap
  // que confundia.
  const categoryDomain = direction === "in" ? ("inflow" as const) : ("expense" as const);
  const categories = activeCategories(
    (direction === "in" ? catalog?.inflow : catalog?.expense) ?? [],
  );

  function refreshCatalog(selectKey?: string) {
    void listCategoriesQuery().then((result) => {
      setCatalog(result);
      if (selectKey) setCategory(selectKey);
    });
  }

  // Nudge macro: se a pessoa tenta lançar "salário" como entrada avulsa, lembra
  // que renda recorrente tem porta própria e entra na projeção.
  const descriptionValue = form.watch("description");
  const looksLikeRecurringIncome =
    direction === "in" && /sal[áa]rio|sal[áa]rios/i.test(descriptionValue ?? "");

  function onSubmit(values: FormValues) {
    setServerError(null);
    if (values.amountCents <= 0n) {
      setServerError("O valor precisa ser maior que zero.");
      return;
    }
    const description = values.description.trim();
    if (description.length === 0) {
      setServerError("Descreva o que foi.");
      return;
    }
    if (status === "scheduled" && !isFutureIso(occurredAt)) {
      setServerError("Um agendamento precisa de uma data futura.");
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
      await queryClient.invalidateQueries({ queryKey: ["annual-report"] });
      const wasScheduled = status === "scheduled";
      toast.success(
        wasScheduled
          ? "Agendado. Entra no saldo no dia."
          : direction === "in"
            ? "Entrada registrada."
            : "Saída registrada.",
      );
      if (result.data?.event) {
        setEventResult(result.data.event);
        return;
      }
      router.push("/app/lancamentos" as Route);
    });
  }

  if (eventResult) {
    return (
      <IncomeFreeBalanceResult
        event={eventResult}
        onDone={() => router.push("/app/lancamentos" as Route)}
      />
    );
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
        Registre uma entrada ou saída avulsa. Conta que se repete todo mês? Use Renda ou Dívidas.
      </p>

      <MoneyInput
        control={form.control}
        name="amountCents"
        label="Valor"
        required
        currency={accounts?.find((a) => a.id === accountId)?.currency ?? "BRL"}
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
          placeholder={direction === "in" ? t("form.inPlaceholder") : t("form.outPlaceholder")}
          {...form.register("description")}
          className={wizardInputClass}
        />
        {looksLikeRecurringIncome ? (
          <p className="animate-in text-[0.75rem] leading-relaxed text-[color:var(--text-secondary)] fade-in-0 duration-150">
            Recebe todo mês?{" "}
            <Link
              href={"/app/renda/nova" as Route}
              className="font-semibold text-[color:var(--color-brand-500)] hover:underline"
            >
              Cadastre como renda
            </Link>{" "}
            pra entrar na sua projeção.
          </p>
        ) : null}
      </div>

      <div className={`flex flex-col gap-1.5 ${showCategory ? "" : "hidden"}`}>
        <span className="flex items-center justify-between">
          <span
            id={categoryId}
            className="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]"
          >
            Categoria (opcional)
          </span>
          <Link
            href={"/app/configuracoes/categorias" as Route}
            aria-label="Gerenciar categorias"
            className="focus-ring rounded-md text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
          >
            <Pencil size={13} strokeWidth={2} aria-hidden />
          </Link>
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
        <button
          type="button"
          onClick={() => setShowCreateCategory(true)}
          className="focus-ring inline-flex w-fit items-center gap-1.5 rounded-lg text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
        >
          <Plus size={14} strokeWidth={2.5} aria-hidden />
          Criar categoria
        </button>
        <CreateCategorySheet
          open={showCreateCategory}
          onOpenChange={setShowCreateCategory}
          domain={categoryDomain}
          isPro={catalog?.isPro ?? false}
          activeCount={categories.length}
          onCreated={(key) => refreshCatalog(key)}
        />
      </div>

      {accounts !== null && accounts.length <= 1 && !showAccount ? (
        <button
          type="button"
          onClick={() => setShowAccount(true)}
          className="focus-ring w-fit text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
        >
          Outra conta
        </button>
      ) : null}

      <div
        className={`flex flex-col gap-1.5 ${
          accounts !== null && accounts.length <= 1 && !showAccount ? "hidden" : ""
        }`}
      >
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
                        {a.currency !== "BRL" ? (
                          <span className="rounded-md bg-[color:var(--surface-2)] px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.5px] text-[color:var(--text-secondary)]">
                            {a.currency}
                          </span>
                        ) : null}
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <button
              type="button"
              onClick={() => setShowNewAccount(true)}
              className="focus-ring inline-flex w-fit items-center gap-1.5 rounded-lg text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
            >
              <Plus size={14} strokeWidth={2.5} aria-hidden />
              Nova conta
            </button>

            <Sheet
              open={showNewAccount}
              onOpenChange={(open) => {
                setShowNewAccount(open);
                if (!open) setNewAccountName("");
              }}
            >
              <SheetContent side="bottom" className="flex flex-col gap-4">
                <SheetHeader>
                  <SheetTitle>Nova conta</SheetTitle>
                  <SheetDescription>
                    Um lugar pra guardar e movimentar dinheiro: Nubank, poupança, dinheiro vivo.
                  </SheetDescription>
                </SheetHeader>
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
                <Button
                  type="button"
                  variant="brand"
                  loading={accountPending}
                  onClick={handleCreateAccount}
                >
                  Criar conta
                </Button>
              </SheetContent>
            </Sheet>
          </>
        ) : null}
      </div>

      {showSchedule ? (
        <div className="flex animate-in flex-col gap-1.5 fade-in-0 duration-150">
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
              onClick={() => {
                setStatus("scheduled");
                setShowDate(true);
                if (!isFutureIso(occurredAt)) setOccurredAt(tomorrowIso());
              }}
              className={segmentClass(status === "scheduled", "brand")}
            >
              <CalendarClock size={15} strokeWidth={2.25} aria-hidden />
              Agendado
            </button>
          </div>
        </div>
      ) : null}

      {showDate ? (
        <div className="flex animate-in flex-col gap-1.5 fade-in-0 duration-150">
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
            min={status === "scheduled" ? tomorrowIso() : undefined}
            onChange={(e) => setOccurredAt(e.target.value)}
            className={wizardInputClass}
          />
          {status === "scheduled" ? (
            <p className="text-[0.75rem] text-[color:var(--text-secondary)]">
              Entra no saldo no dia. Até lá, fica como previsto.
            </p>
          ) : null}
        </div>
      ) : null}

      {!showSchedule || !showDate || !showCategory ? (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {!showCategory ? (
            <button
              type="button"
              onClick={() => setShowCategory(true)}
              className="focus-ring inline-flex w-fit items-center gap-1.5 rounded-lg text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
            >
              <Tag size={14} strokeWidth={2.25} aria-hidden />
              Classificar
            </button>
          ) : null}
          {!showSchedule ? (
            <button
              type="button"
              onClick={() => {
                setShowSchedule(true);
                setShowDate(true);
                setStatus("scheduled");
                setOccurredAt(tomorrowIso());
              }}
              className="focus-ring inline-flex w-fit items-center gap-1.5 rounded-lg text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
            >
              <CalendarClock size={14} strokeWidth={2.25} aria-hidden />
              Agendar pra depois
            </button>
          ) : null}
          {!showDate ? (
            <button
              type="button"
              onClick={() => setShowDate(true)}
              className="focus-ring inline-flex w-fit items-center gap-1.5 rounded-lg text-[0.8125rem] font-semibold text-[color:var(--color-brand-500)] hover:underline"
            >
              <CalendarDays size={14} strokeWidth={2.25} aria-hidden />
              Outra data
            </button>
          ) : null}
        </div>
      ) : null}

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
