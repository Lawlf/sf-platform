"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { type ReactNode, useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { ExpenseCategory } from "@/domain/entities/debt.entity";
import { CURRENCIES, type Currency } from "@/domain/value-objects/money.vo";
import { formatCents } from "@/shared/format/money-format";

import { todayIso } from "../../../_lib/dates";
import { EXPENSE_CATEGORIES, expenseCategoryLabel } from "../../../_lib/expense-categories";
import { invalidateDebtCaches } from "../../../_lib/invalidate";
import { SummaryList } from "../../_components/summary-list";
import { WizardField, wizardInputClass } from "../../_components/wizard-field";
import { WizardMoneyField } from "../../_components/wizard-money-field";
import { WizardShell } from "../../_components/wizard-shell";
import { createRecurringDebtAction } from "../_actions/create-recurring-debt.action";

type Frequency = "monthly" | "weekly" | "annual";

const formSchema = z.object({
  expenseCategory: z.enum([
    "housing",
    "utilities",
    "food",
    "transport",
    "health",
    "leisure",
    "subscriptions",
    "education",
    "other",
  ]),
  recurringFrequency: z.enum(["monthly", "weekly", "annual"]),
  label: z.string().min(1, "Informe um rótulo.").max(120),
  recurringAmountCents: z.bigint().positive("Valor deve ser positivo."),
  currency: z.enum(CURRENCIES),
  startDate: z.string().min(1, "Informe a data de início."),
  endDate: z.string().nullable().optional(),
  notes: z.string().optional().nullable(),
  dueDay: z.number().int().min(1, "Use de 1 a 31.").max(31, "Use de 1 a 31.").nullable(),
});

type FormValues = z.infer<typeof formSchema>;


type Step = 1 | 2 | 3 | 4;

const STEP3_FIELDS = ["label", "recurringAmountCents", "startDate"] as const;

function formatAmount(cents: bigint | null | undefined, currency: Currency): string {
  return formatCents(cents ?? 0n, currency);
}

function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "Sem data";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function frequencyLabel(freq: Frequency): string {
  if (freq === "monthly") return "Mensal";
  if (freq === "weekly") return "Semanal";
  return "Anual";
}

function categoryLabel(id: ExpenseCategory): string {
  return expenseCategoryLabel(id);
}

interface CategoryCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  active: boolean;
  pending: boolean;
  onSelect: () => void;
}

function CategoryCard({ icon, title, description, active, pending, onSelect }: CategoryCardProps) {
  const filled = active || pending;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={filled}
      disabled={pending}
      className={`flex w-full items-center gap-3 rounded-[14px] border-[1.5px] p-3 backdrop-blur-[16px] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)] ${
        filled
          ? "scale-[0.98] border-[color:var(--color-brand-500)] bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white shadow-[0_6px_20px_rgba(239,122,26,0.35)]"
          : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)] hover:bg-[color:var(--surface-2)] active:scale-[0.99]"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200 ${
          filled
            ? "bg-white/25 text-white"
            : "bg-[color:var(--color-brand-500)]/15 text-[color:var(--color-brand-800)]"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1 text-left">
        <span
          className={`block text-[0.875rem] font-bold transition-colors duration-200 ${
            filled ? "text-white" : "text-[color:var(--text-primary)]"
          }`}
        >
          {title}
        </span>
        <span
          className={`mt-0.5 block text-[0.6875rem] leading-[1.3] transition-colors duration-200 ${
            filled ? "text-white/90" : "text-[color:var(--text-primary)] opacity-65"
          }`}
        >
          {description}
        </span>
      </span>
    </button>
  );
}

export function RecurringDebtForm({
  defaultCurrency = "BRL",
}: { defaultCurrency?: Currency } = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [pending, startTransition] = useTransition();
  const [pendingCategory, setPendingCategory] = useState<ExpenseCategory | null>(null);
  const [pendingFrequency, setPendingFrequency] = useState<Frequency | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const labelId = useId();
  const amountId = useId();
  const startDateId = useId();
  const endDateId = useId();
  const dueDayId = useId();
  const notesId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      expenseCategory: undefined as unknown as ExpenseCategory,
      recurringFrequency: undefined as unknown as Frequency,
      label: "",
      recurringAmountCents: 0n as unknown as bigint,
      currency: defaultCurrency,
      startDate: todayIso(),
      endDate: null,
      notes: null,
      dueDay: null,
    },
  });

  const values = form.watch();
  const errors = form.formState.errors;

  function selectCategory(id: ExpenseCategory) {
    if (pendingCategory) return;
    setPendingCategory(id);
    form.setValue("expenseCategory", id, { shouldValidate: false });
    window.setTimeout(() => {
      setPendingCategory(null);
      setStep(2);
    }, 240);
  }

  function selectFrequency(freq: Frequency) {
    if (pendingFrequency) return;
    setPendingFrequency(freq);
    form.setValue("recurringFrequency", freq, { shouldValidate: false });
    window.setTimeout(() => {
      setPendingFrequency(null);
      setStep(3);
    }, 240);
  }

  async function goToStep4() {
    const valid = await form.trigger(STEP3_FIELDS as Parameters<typeof form.trigger>[0]);
    if (valid) setStep(4);
  }

  async function handleSubmit() {
    setServerError(null);
    const valid = await form.trigger();
    if (!valid) return;
    const v = form.getValues();
    const fd = new FormData();
    fd.set("label", v.label);
    fd.set("recurringFrequency", v.recurringFrequency);
    fd.set("recurringAmountCents", v.recurringAmountCents.toString());
    fd.set("currency", v.currency);
    fd.set("expenseCategory", v.expenseCategory);
    fd.set("startDate", v.startDate);
    fd.set("endDate", v.endDate ?? "");
    fd.set("notes", v.notes ?? "");
    fd.set("dueDay", v.dueDay != null ? String(v.dueDay) : "");
    startTransition(async () => {
      const r = await createRecurringDebtAction(fd);
      if (!r.ok) {
        setServerError(r.message);
        return;
      }
      await invalidateDebtCaches(queryClient);
      router.push(`/app/dividas/${r.data.debtId}` as Route);
    });
  }

  const arrowRight = <ArrowRight size={14} strokeWidth={2} aria-hidden />;

  if (step === 1) {
    return (
      <WizardShell
        currentStep={1}
        totalSteps={4}
        title="Qual a categoria?"
        description="Escolha a categoria que melhor descreve esse compromisso."
        onBack={() => router.push("/app/dividas/nova" as Route)}
      >
        <div role="radiogroup" aria-label="Categoria" className="flex flex-col gap-2 md:gap-3.5">
          {EXPENSE_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <CategoryCard
                key={cat.id}
                icon={<Icon size={20} strokeWidth={1.75} aria-hidden />}
                title={cat.label}
                description={cat.description}
                active={values.expenseCategory === cat.id}
                pending={pendingCategory === cat.id}
                onSelect={() => selectCategory(cat.id)}
              />
            );
          })}
        </div>
      </WizardShell>
    );
  }

  if (step === 2) {
    return (
      <WizardShell
        currentStep={2}
        totalSteps={4}
        title="Com que frequência?"
        description="Quantas vezes esse compromisso aparece no seu fluxo."
        onBack={() => setStep(1)}
      >
        <div role="radiogroup" aria-label="Frequência" className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => selectFrequency("monthly")}
            aria-pressed={values.recurringFrequency === "monthly"}
            disabled={pendingFrequency !== null}
            className={`rounded-xl border-[1.5px] p-4 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)] ${
              values.recurringFrequency === "monthly" || pendingFrequency === "monthly"
                ? "border-[color:var(--color-brand-500)] bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white shadow-[0_6px_20px_rgba(239,122,26,0.35)]"
                : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)] hover:bg-[color:var(--surface-1)]"
            }`}
          >
            <div className="text-[0.9375rem] font-bold">Mensal</div>
            <div className="mt-1 text-[0.6875rem] opacity-80">Todo mês</div>
          </button>
          <button
            type="button"
            onClick={() => selectFrequency("weekly")}
            aria-pressed={values.recurringFrequency === "weekly"}
            disabled={pendingFrequency !== null}
            className={`rounded-xl border-[1.5px] p-4 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)] ${
              values.recurringFrequency === "weekly" || pendingFrequency === "weekly"
                ? "border-[color:var(--color-brand-500)] bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white shadow-[0_6px_20px_rgba(239,122,26,0.35)]"
                : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)] hover:bg-[color:var(--surface-1)]"
            }`}
          >
            <div className="text-[0.9375rem] font-bold">Semanal</div>
            <div className="mt-1 text-[0.6875rem] opacity-80">Toda semana</div>
          </button>
          <button
            type="button"
            onClick={() => selectFrequency("annual")}
            aria-pressed={values.recurringFrequency === "annual"}
            disabled={pendingFrequency !== null}
            className={`rounded-xl border-[1.5px] p-4 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand-500)] ${
              values.recurringFrequency === "annual" || pendingFrequency === "annual"
                ? "border-[color:var(--color-brand-500)] bg-[linear-gradient(135deg,#f28e25,#ef7a1a)] text-white shadow-[0_6px_20px_rgba(239,122,26,0.35)]"
                : "border-[color:var(--border-soft)] bg-[color:var(--surface-1)] hover:bg-[color:var(--surface-1)]"
            }`}
          >
            <div className="text-[0.9375rem] font-bold">Anual</div>
            <div className="mt-1 text-[0.6875rem] opacity-80">Uma vez por ano</div>
          </button>
        </div>
        <p className="mt-3 text-[0.75rem] leading-[1.5] text-[color:var(--text-primary)] opacity-65">
          Você pode editar depois.
        </p>
      </WizardShell>
    );
  }

  if (step === 3) {
    const periodLabel =
      values.recurringFrequency === "monthly"
        ? "Valor por mês"
        : values.recurringFrequency === "weekly"
          ? "Valor por semana"
          : "Valor por ano";
    return (
      <WizardShell
        currentStep={3}
        totalSteps={4}
        title="Detalhes"
        description="Nome do compromisso, valor por período e datas."
        onBack={() => setStep(2)}
        primary={{
          label: "Continuar",
          onClick: () => {
            void goToStep4();
          },
          icon: arrowRight,
        }}
      >
        <WizardField label="Rótulo" htmlFor={labelId} error={errors.label?.message}>
          <input
            id={labelId}
            {...form.register("label")}
            placeholder="Ex: Netflix"
            className={wizardInputClass}
          />
        </WizardField>

        <WizardField
          label={periodLabel}
          htmlFor={amountId}
          error={errors.recurringAmountCents?.message}
        >
          <WizardMoneyField
            control={form.control}
            name="recurringAmountCents"
            id={amountId}
            placeholder="R$ 0,00"
            currency={values.currency}
            onCurrencyChange={(c) => form.setValue("currency", c)}
          />
        </WizardField>

        <WizardField label="Data de início" htmlFor={startDateId} error={errors.startDate?.message}>
          <input
            id={startDateId}
            type="date"
            {...form.register("startDate")}
            className={wizardInputClass}
          />
        </WizardField>

        <WizardField
          label="Data de fim (opcional)"
          htmlFor={endDateId}
          helper="Deixe em branco se não tem prazo definido."
        >
          <input
            id={endDateId}
            type="date"
            {...form.register("endDate")}
            className={wizardInputClass}
          />
        </WizardField>

        {values.recurringFrequency === "monthly" ? (
          <WizardField
            label="Dia do pagamento (opcional)"
            htmlFor={dueDayId}
            helper="Dia do mês em que o pagamento cai (1 a 31). Usado pra avisar no calendário."
            error={errors.dueDay?.message}
          >
            <input
              id={dueDayId}
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              placeholder="Ex: 10"
              {...form.register("dueDay", {
                setValueAs: (v) => {
                  if (v === "" || v === null || v === undefined) return null;
                  const n = Number(v);
                  return Number.isFinite(n) ? n : null;
                },
              })}
              className={wizardInputClass}
            />
          </WizardField>
        ) : null}

        <WizardField label="Observações (opcional)" htmlFor={notesId}>
          <textarea
            id={notesId}
            {...form.register("notes")}
            placeholder="Algum detalhe que ajude a lembrar"
            rows={3}
            className={`${wizardInputClass} resize-y`}
          />
        </WizardField>
      </WizardShell>
    );
  }

  // step 4
  const summary = [
    { label: "Categoria", value: categoryLabel(values.expenseCategory) },
    { label: "Frequência", value: frequencyLabel(values.recurringFrequency) },
    { label: "Rótulo", value: values.label || "Sem rótulo" },
    {
      label: values.recurringFrequency === "monthly" ? "Valor mensal" : "Valor semanal",
      value: formatAmount(values.recurringAmountCents, values.currency),
    },
    { label: "Início", value: formatDateBR(values.startDate) },
    { label: "Fim", value: values.endDate ? formatDateBR(values.endDate) : "Sem prazo" },
    ...(values.recurringFrequency === "monthly"
      ? [
          {
            label: "Dia do pagamento",
            value: values.dueDay != null ? `Todo dia ${values.dueDay}` : "Sem dia fixo",
          },
        ]
      : []),
  ];

  return (
    <WizardShell
      currentStep={4}
      totalSteps={4}
      title="Confirme os dados"
      description="Confere os números e salva."
      onBack={() => setStep(3)}
      primary={{
        label: "Salvar compromisso",
        onClick: () => {
          void handleSubmit();
        },
        disabled: pending,
        loading: pending,
      }}
    >
      <SummaryList items={summary} />

      {serverError ? (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-[color:var(--semantic-negative)]/30 bg-[color:var(--semantic-negative)]/10 px-3 py-2 text-[0.8125rem] text-[color:var(--semantic-negative)]"
        >
          {serverError}
        </div>
      ) : null}
    </WizardShell>
  );
}
